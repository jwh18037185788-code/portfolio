import { trackTaskAction } from '@/lib/taskAnalytics';
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { WorkbenchBdStatsDto } from '@/types/workbench';
import { MT } from '../../theme';

interface BdQuadrantChartProps {
  list: WorkbenchBdStatsDto[];
  /** 点击任意点位调用（引导进入督办确认弹窗，非定向单 BD 请求） */
  onPointClick: () => void;
}

/**
 * 四象限判定结果（前端按中位数分割线实时计算，而非后端 supportLabel），
 * 象限归属与颜色一一绑定，杜绝同一象限出现不同颜色点的矛盾情况：
 * 0=左上（低负荷+执行稳定，执行稳定/绿）
 * 1=左下（低负荷+执行偏弱，待排查/黄）
 * 2=右上（高负荷+执行稳定，高负荷稳定/蓝）
 * 3=右下（高负荷+执行偏弱，优先支持/红，可一键进入督办确认）
 */
const QUADRANT_COLOR: Record<number, string> = {
  0: MT.chart.quadrantColors.stable,
  1: MT.chart.quadrantColors.slow,
  2: MT.chart.quadrantColors.normal,
  3: MT.chart.quadrantColors.urgent,
};

const QUADRANT_TEXT: Record<number, string> = {
  0: '状态稳定',
  1: '进度偏慢',
  2: '任务承压',
  3: '需要关注',
};

const MEDIAN_LINE_COLOR = '#B9BEC8';
const MEDIAN_LABEL_COLOR = '#666666';
const CHART_GRID_TOP = 28;
const MEDIAN_LABEL_LINE_HEIGHT = 14;
const MEDIAN_LABEL_GAP = 5;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

interface AxisDomain {
  min: number;
  max: number;
  interval: number;
  range: number;
}

/**
 * 为像素距离很近的点分配稳定的偏移量。偏移仅作用于散点符号的绘制位置：
 * value 仍保留后端返回的真实 totalCount/completionRate，Tooltip、分割线和象限判定不受影响。
 */
function createStableSymbolOffsets<T extends { bdId: string; plotX: number; plotY: number; _quadrant: number }>(
  data: T[],
  xDomain: AxisDomain,
  yDomain: AxisDomain,
): Map<string, [number, number]> {
  const xCellSize = Math.max(xDomain.range / 32, xDomain.interval / 2);
  const yCellSize = Math.max(yDomain.range / 22, yDomain.interval / 2);
  const clusters = new Map<string, T[]>();

  data.forEach((item) => {
    const xCell = Math.round((item.plotX - xDomain.min) / xCellSize);
    const yCell = Math.round((item.plotY - yDomain.min) / yCellSize);
    const key = `${item._quadrant}:${xCell}:${yCell}`;
    clusters.set(key, [...(clusters.get(key) ?? []), item]);
  });

  const offsets = new Map<string, [number, number]>();
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  clusters.forEach((items) => {
    if (items.length === 1) {
      offsets.set(items[0].bdId, [0, 0]);
      return;
    }

    [...items]
      .sort((a, b) => a.bdId.localeCompare(b.bdId))
      .forEach((item, index) => {
        // 半径设上限，避免大量同坐标点的偏移越过图表边缘；超出容量的点保持可 Hover，
        // 但不再继续扩大偏移范围制造超出象限的视觉误差。
        const radius = Math.min(30, 8 + 7 * Math.sqrt(index));
        const angle = index * goldenAngle;
        const rawOffsetX = Math.round(Math.cos(angle) * radius);
        const rawOffsetY = Math.round(Math.sin(angle) * radius);
        // 朝所属象限的内部中心偏移：既不跨中位数分割线，也不会将外边缘点推到绘图区外。
        const targetPlotX = item._quadrant === 0 || item._quadrant === 1
          ? xDomain.min + xDomain.range * 0.25
          : xDomain.min + xDomain.range * 0.75;
        const targetPlotY = item._quadrant === 0 || item._quadrant === 2
          ? yDomain.min + yDomain.range * 0.75
          : yDomain.min + yDomain.range * 0.25;
        const offsetX = item.plotX <= targetPlotX ? Math.abs(rawOffsetX) : -Math.abs(rawOffsetX);
        // ECharts 的 y 像素正方向向下，与数据坐标正方向相反。
        const offsetY = item.plotY <= targetPlotY ? -Math.abs(rawOffsetY) : Math.abs(rawOffsetY);
        offsets.set(item.bdId, [offsetX, offsetY]);
      });
  });

  return offsets;
}

/**
 * ECharts 的 symbolOffset 使用屏幕坐标（y 正值向下）。将防重叠偏移限制在点所属象限内部，
 * 并把恰好压在中位线上的点向其归属象限轻推 6px，避免颜色正确但视觉上落入相邻底色区域。
 */
function constrainOffsetToQuadrant(
  offset: [number, number],
  quadrant: 0 | 1 | 2 | 3,
  onXMedian: boolean,
  onYMedian: boolean,
): [number, number] {
  const isLeft = quadrant === 0 || quadrant === 1;
  const isUpper = quadrant === 0 || quadrant === 2;
  const xMagnitude = onXMedian ? Math.max(6, Math.abs(offset[0])) : Math.abs(offset[0]);
  const yMagnitude = onYMedian ? Math.max(6, Math.abs(offset[1])) : Math.abs(offset[1]);
  return [isLeft ? -xMagnitude : xMagnitude, isUpper ? -yMagnitude : yMagnitude];
}

/**
 * 按当前 xMedian/yMedian 分割线计算某个点所属象限（0/1/2/3，见 QUADRANT_COLOR 注释），
 * 横轴 totalCount>=xMedian 视为"高负荷"，纵轴 completionRate>=yMedian 视为"执行稳定"，
 * 取等号统一归入"高/稳定"一侧，保证边界点也有确定归属、不会遗漏。
 */
function resolveQuadrant(totalCount: number, completionRate: number, xMedian: number, yMedian: number): 0 | 1 | 2 | 3 {
  const highLoad = totalCount >= xMedian;
  const stable = completionRate >= yMedian;
  if (!highLoad && stable) return 0; // 左上
  if (!highLoad && !stable) return 1; // 左下
  if (highLoad && stable) return 2; // 右上
  return 3; // 右下
}

/**
 * 需关注 BD 四象限散点图：基于 ECharts scatter 还原视觉稿样式——
 * 象限背景色块（markArea）+ 中位数虚线分割（markLine）+ 自定义卡片式 tooltip。
 * 点位置：x=totalCount, y=completionRate，分割线取当前 list 的中位数（前端计算）。
 * 横纵轴均按当前数据最小值、中位数、最大值自适应展开：中位数固定在视觉中心，主体数据尽量铺满绘图区。重叠点按象限独立聚类并向象限内部中心错位，偏移半径受上限保护。
 * 点颜色：按该点相对中位数分割线所属的象限实时计算（_quadrant，见 resolveQuadrant），
 * 不采用后端 supportLabel（固定阈值口径与中位数动态分割线口径不一致，会出现同一象限内颜色不统一的矛盾）。
 */
const BdQuadrantChart: React.FC<BdQuadrantChartProps> = ({ list, onPointClick }) => {
  const { option } = useMemo(() => {
    if (list.length === 0) {
      return { option: null };
    }
    const xValues = list.map((d) => d.totalCount);
    const yValues = list.map((d) => d.completionRate);
    const xMed = median(xValues);
    const yMed = median(yValues);
    /**
     * 视觉布局采用以中位数为锚点的分位数尺度：低于/高于中位数的不同取值分别均匀展开。
     * 因而兼容聚合、离散、离群及多峰分布；原始指标仅用于象限归属、Tooltip 与刻度反算。
     */
    const createDistributionScale = (values: number[], medianValue: number) => {
      const uniqueValues = [...new Set(values)].sort((a, b) => a - b);
      const lowerValues = uniqueValues.filter((value) => value < medianValue);
      const upperValues = uniqueValues.filter((value) => value > medianValue);
      const positions = new Map<number, number>([[medianValue, 50]]);
      const assignPositions = (items: number[], start: number, end: number, fallback: number) => {
        items.forEach((value, index) => {
          const ratio = items.length === 1 ? fallback : index / (items.length - 1);
          positions.set(value, start + (end - start) * ratio);
        });
      };
      assignPositions(lowerValues, 8, 46, 0.5);
      assignPositions(upperValues, 54, 92, 0.5);

      const anchors = [...positions.entries()]
        .map(([value, plot]) => ({ value, plot }))
        .sort((a, b) => a.plot - b.plot);
      const isFlat = uniqueValues.length === 1;
      const toPlot = (value: number) => positions.get(value) ?? 50;
      const fromPlot = (plot: number) => {
        if (isFlat) return medianValue;
        const upperIndex = anchors.findIndex((anchor) => anchor.plot >= plot);
        if (upperIndex <= 0) return anchors[0].value;
        if (upperIndex === -1) return anchors[anchors.length - 1].value;
        const lower = anchors[upperIndex - 1];
        const upper = anchors[upperIndex];
        const ratio = (plot - lower.plot) / (upper.plot - lower.plot);
        return lower.value + (upper.value - lower.value) * ratio;
      };
      const formatAxisLabel = (plot: number, suffix = '') => {
        if (isFlat && Math.abs(plot - 50) > 0.1) return '';
        const value = fromPlot(plot);
        return `${Number.isInteger(value) ? value : value.toFixed(1)}${suffix}`;
      };
      return {
        toPlot,
        fromPlot,
        formatAxisLabel,
        isFlat,
        domain: { min: 8, max: 92, interval: 21, range: 84 },
      };
    };
    // 布局位置按分布自适应展开；业务含义仍完全使用后端的原始任务量和完成率。
    const xScale = createDistributionScale(xValues, xMed);
    const yScale = createDistributionScale(yValues, yMed);
    const toPlotX = xScale.toPlot;
    const toPlotY = yScale.toPlot;
    const xDomain = xScale.domain;
    const yDomain = yScale.domain;
    const data = list.map((d) => ({
      ...d,
      plotX: toPlotX(d.totalCount),
      plotY: toPlotY(d.completionRate),
      _quadrant: resolveQuadrant(d.totalCount, d.completionRate, xMed, yMed),
    }));
    const symbolOffsets = createStableSymbolOffsets(data, xDomain, yDomain);

    const chartOption = {
      grid: { left: 62, right: 42, top: CHART_GRID_TOP + 8, bottom: 52 },
      graphic: [
        { type: 'text', right: 22, bottom: 7, silent: true, style: { text: '任务项总数', fill: MEDIAN_LABEL_COLOR, fontSize: 12, textAlign: 'right' } },
        { type: 'text', left: 8, top: 4, silent: true, style: { text: '任务项完成率', fill: MEDIAN_LABEL_COLOR, fontSize: 12, textAlign: 'left' } },
      ],
      tooltip: {
        trigger: 'item' as const,
        confine: true,
        borderWidth: 0,
        backgroundColor: '#FFFFFF',
        padding: [14, 16] as [number, number],
        extraCssText: 'border-radius:10px;box-shadow:none;',
        formatter: (params: any) => {
          const d = params.data as (typeof data)[number];
          const dotColor = QUADRANT_COLOR[d._quadrant];
          return `<div style="width:260px;color:${MT.textPrimary};line-height:1.2;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:15px;">
              <i style="width:10px;height:10px;border-radius:50%;background:${dotColor};display:inline-block;"></i>
              <b style="font-size:14px;font-weight:600;">${d.bdName ? `${d.bdName} ${d.bdId}` : d.bdId}</b>
              <span style="color:${MT.textMuted};font-size:13px;">${QUADRANT_TEXT[d._quadrant]}</span>
            </div>
            <div style="display:flex;align-items:baseline;gap:8px;">
              <strong style="font-size:18px;line-height:1;letter-spacing:-.3px;color:${dotColor};">${d.completionRate?.toFixed?.(2) ?? d.completionRate}%</strong>
              <span style="color:${MT.textMuted};font-size:13px;">任务项完成率</span>
            </div>
            <div style="height:6px;margin-top:10px;overflow:hidden;border-radius:999px;background:${MT.cardBorder};">
              <i style="display:block;height:100%;border-radius:inherit;width:${Math.min(100, d.completionRate)}%;background:${dotColor};"></i>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px 30px;margin-top:17px;">
              <div style="display:flex;flex-direction:column;gap:4px;"><b style="color:${MT.textPrimary};font-size:13px;font-weight:600;">${d.totalCount}</b><span style="color:${MT.textMuted};font-size:12px;">任务项总数</span></div>
              <div style="display:flex;flex-direction:column;gap:4px;"><b style="color:${MT.textPrimary};font-size:13px;font-weight:600;">${d.completedCount}</b><span style="color:${MT.textMuted};font-size:12px;">任务项完成数</span></div>
              <div style="display:flex;flex-direction:column;gap:4px;"><b style="color:${MT.danger};font-size:13px;font-weight:600;">${d.notAchievedParentTaskCount}</b><span style="color:${MT.textMuted};font-size:12px;">未达标任务批次数</span></div>
              <div style="display:flex;flex-direction:column;gap:4px;"><b style="color:${MT.warning};font-size:13px;font-weight:600;">${d.soonExpireParentTaskCount}</b><span style="color:${MT.textMuted};font-size:12px;">即将到期任务批次数</span></div>
              <div style="display:flex;flex-direction:column;gap:4px;"><b style="color:${MT.danger};font-size:13px;font-weight:600;">${d.expiredParentTaskCount}</b><span style="color:${MT.textMuted};font-size:12px;">已过期任务批次数</span></div>
              <div style="display:flex;flex-direction:column;gap:4px;"><b style="color:${MT.textPrimary};font-size:13px;font-weight:600;">${d.parentTaskCount}</b><span style="color:${MT.textMuted};font-size:12px;">任务批次总数</span></div>
            </div>
          </div>`;
        },
      },
      xAxis: {
        min: xDomain.min,
        max: xDomain.max,
        interval: xDomain.interval,
        splitLine: { lineStyle: { color: MT.cardBorder } },
        axisLine: { lineStyle: { color: MT.cardBorder } },
        axisLabel: { color: MT.textTertiary, margin: 10, formatter: (value: number) => xScale.formatAxisLabel(value) },
      },
      yAxis: {
        min: yDomain.min,
        max: yDomain.max,
        interval: yDomain.interval,
        splitLine: { lineStyle: { color: MT.cardBorder } },
        axisLine: { lineStyle: { color: MT.cardBorder } },
        axisLabel: { color: MT.textTertiary, margin: 10, formatter: (value: number) => yScale.formatAxisLabel(value, '%') },
      },
      series: [
        {
          type: 'scatter' as const,
          symbolSize: 13,
          clip: true,
          data: data.map((d) => ({
            ...d,
            value: [d.plotX, d.plotY],
            symbolOffset: symbolOffsets.get(d.bdId) ?? [0, 0],
            itemStyle: { color: QUADRANT_COLOR[d._quadrant], opacity: 0.9 },
          })),
          label: {
            show: true,
            position: 'top' as const,
            distance: 5,
            color: MT.textMuted,
            fontSize: 11,
            formatter: (params: any) => params.data.bdName || params.data.bdId,
            textBorderColor: '#FFFFFF',
            textBorderWidth: 3,
          },
          markLine: {
            silent: true,
            symbol: 'none' as const,
            label: {
              show: true,
              color: MEDIAN_LABEL_COLOR,
              fontSize: 12,
              distance: MEDIAN_LABEL_GAP,
            },
            lineStyle: { type: 'dashed' as const, color: MEDIAN_LINE_COLOR, width: 1, opacity: 1 },
            emphasis: {
              label: { show: true, color: MEDIAN_LABEL_COLOR, fontSize: 12 },
              lineStyle: { type: 'dashed' as const, color: MEDIAN_LINE_COLOR, width: 1, opacity: 1 },
            },
            blur: {
              label: { show: true, color: MEDIAN_LABEL_COLOR, fontSize: 12 },
              lineStyle: { type: 'dashed' as const, color: MEDIAN_LINE_COLOR, width: 1, opacity: 1 },
            },
            select: {
              label: { show: true, color: MEDIAN_LABEL_COLOR, fontSize: 12 },
              lineStyle: { type: 'dashed' as const, color: MEDIAN_LINE_COLOR, width: 1, opacity: 1 },
            },
            data: [
              {
                xAxis: toPlotX(xMed),
                label: { show: true, position: 'insideEndTop' as const, color: MEDIAN_LABEL_COLOR, fontSize: 12, distance: MEDIAN_LABEL_GAP, formatter: () => `${Number.isInteger(xMed) ? xMed : xMed.toFixed(1)}` },
                lineStyle: { type: 'dashed' as const, color: MEDIAN_LINE_COLOR, width: 1, opacity: 1 },
              },
              {
                yAxis: toPlotY(yMed),
                label: { show: true, position: 'insideEndTop' as const, color: MEDIAN_LABEL_COLOR, fontSize: 12, distance: MEDIAN_LABEL_GAP, formatter: () => `${yMed.toFixed(1)}%` },
                lineStyle: { type: 'dashed' as const, color: MEDIAN_LINE_COLOR, width: 1, opacity: 1 },
              },
            ],
            z: 10,
          },
          markArea: {
            silent: true,
            z: 1,
            data: [
              [{ xAxis: xDomain.min, yAxis: toPlotY(yMed), itemStyle: { color: 'rgba(84,190,32,.035)' } }, { xAxis: toPlotX(xMed), yAxis: yDomain.max }],
              [{ xAxis: toPlotX(xMed), yAxis: toPlotY(yMed), itemStyle: { color: 'rgba(72,42,247,.035)' } }, { xAxis: xDomain.max, yAxis: yDomain.max }],
              [{ xAxis: xDomain.min, yAxis: yDomain.min, itemStyle: { color: 'rgba(242,140,30,.035)' } }, { xAxis: toPlotX(xMed), yAxis: toPlotY(yMed) }],
              [{ xAxis: toPlotX(xMed), yAxis: yDomain.min, itemStyle: { color: 'rgba(249,83,85,.035)' } }, { xAxis: xDomain.max, yAxis: toPlotY(yMed) }],
            ],
          },
        },
      ],
    };

    return { option: chartOption };
  }, [list]);

  if (!option) {
    return null;
  }

  return (
    <div>
      <ReactECharts
        option={option}
        style={{ height: 320 }}
        notMerge
        onEvents={{ click: (params: any) => { if (params.componentType === 'series') { trackTaskAction('focus.quadrant_point'); onPointClick(); } } }}
      />
    </div>
  );
};

export default BdQuadrantChart;
