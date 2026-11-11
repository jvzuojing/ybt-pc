<template>
  <div class="center-panel-root">
    <div
      v-loading="globalDataLoading"
      element-loading-text="报表概览加载中..."
      element-loading-background="rgba(3, 10, 28, 0.38)"
      class="center-top panel"
    >
      <div class="panel-title">
        <span class="panel-title-text">报表概览</span>
        <div class="dashboard-tabs">
          <span
            v-for="tab in reportTabs"
            :key="tab.key"
            class="dashboard-tab"
            :class="{ active: reportTab === tab.key }"
            @click="reportTab = tab.key"
          >{{ tab.label }}</span>
        </div>
      </div>

      <!-- 国家报表：原有内容保持不变 -->
      <div v-if="reportTab === 'national'" class="report-content">
        <div class="report-card-list">
          <div
            v-for="card in reportSummaryCards"
            :key="card.key"
            class="report-card"
            :class="{ clickable: !!card.detailType }"
            :title="card.detailType ? '点击查看明细' : ''"
            @click="card.detailType && openReportDetail(card.detailType)"
          >
            <div class="rc-label">
              {{ card.label }}
              <span v-if="card.detailType" class="click-hint">查看明细</span>
            </div>
            <div
              class="rc-value"
              :class="{ 'rc-value-long': String(card.value ?? '').length >= 10 }"
            >{{ card.value }}</div>
          </div>
          <div
            v-for="card in currentReport.statusCards"
            :key="card.key"
            class="report-card"
          >
            <div class="rc-label">{{ card.label }}</div>
            <div class="rc-value" :class="card.accent">{{ card.value }}</div>
          </div>
        </div>

        <!-- 分布情况 -->
        <div class="report-distribution">
          <div ref="distributionRef" class="chart-distribution"></div>
        </div>
      </div>

      <!-- 自治区报表：数据来自 getFillCount（isExtended false/true），明细走弹窗 -->
      <div v-else class="report-content auto-report">
        <div class="auto-sub-tabs">
          <span
            v-for="tab in autoTabs"
            :key="tab.key"
            class="auto-sub-tab"
            :class="{ active: autoTab === tab.key }"
            @click="autoTab = tab.key"
          >{{ tab.label }}</span>
        </div>
        <div class="auto-body" :class="{ 'auto-body--simplify': autoTab === 'simplify' }">
          <div class="auto-cards">
            <div
              v-for="card in autoCards"
              :key="card.key"
              class="auto-card"
              :class="{ clickable: autoHasData }"
              @click="autoHasData && openAutoDetail()"
            >
              <div class="ac-label">{{ card.label }}</div>
              <div class="ac-value">
                {{ card.value }}<span v-if="card.unit" class="ac-unit">{{ card.unit }}</span>
                <span v-if="autoHasData" class="ac-doc">📋</span>
              </div>
            </div>
          </div>
          <div v-if="autoTab === 'data'" class="auto-chart-col auto-chart-col--wide">
            <div class="auto-sec-title">分布情况</div>
            <div v-if="autoHasData" ref="autoBarRef" class="auto-chart"></div>
            <div v-else class="auto-chart auto-chart--empty">暂无数据</div>
          </div>
          <div class="auto-chart-col">
            <div class="auto-sec-title">按周期统计</div>
            <div v-if="autoHasData" ref="autoDonutRef" class="auto-chart"></div>
            <div v-else class="auto-chart auto-chart--empty">暂无数据</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 报表/任务详情弹窗 -->
    <el-dialog
      v-model="showReportDialog"
      :title="reportDialogTitle"
      width="1000px"
      :close-on-click-modal="false"
      class="dark-dialog"
    >
      <el-table
        v-if="reportDialogType === 'report'"
        v-loading="dialogLoading"
        :data="dialogList"
        size="small"
        height="420"
        class="report-dialog-table"
      >
        <el-table-column prop="name" label="报表名称" min-width="200" show-overflow-tooltip />
        <!-- 报表编码/报表版本列暂时隐藏：恢复时把 v-if="false" 去掉即可 -->
        <el-table-column v-if="false" prop="code" label="报表编码" width="90" show-overflow-tooltip />
        <el-table-column prop="dept" label="派发部委" width="150" show-overflow-tooltip />
        <el-table-column v-if="false" prop="version" label="报表版本" width="80" align="center" />
        <el-table-column prop="freq" label="更新频次" width="80" align="center" />
        <el-table-column prop="level" label="填报层级" width="90" align="center" />
        <el-table-column prop="receiveDept" label="接收部门" width="140" show-overflow-tooltip />
        <el-table-column prop="method" label="报表下发方式" width="100" align="center" />
        <el-table-column prop="time" label="下发时间" width="100" align="center" />
        <el-table-column prop="status" label="状态" width="80" align="center">
          <template #default="{ row }">
            <span class="status-tag" :class="statusClass(row.status)">{{ row.status }}</span>
          </template>
        </el-table-column>
      </el-table>
      <el-table
        v-else
        v-loading="dialogLoading"
        :data="dialogList"
        size="small"
        height="420"
        class="report-dialog-table"
      >
        <el-table-column prop="name" label="任务名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="dept" label="下发部门" width="130" show-overflow-tooltip />
        <el-table-column prop="receiveTime" label="接收时间" width="150" align="center" />
        <el-table-column prop="receiveDept" label="接收部门" width="160" show-overflow-tooltip />
        <el-table-column prop="progress" label="填报进展" width="80" align="center">
          <template #default="{ row }">
            <span class="cell-cyan">{{ row.progress }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="dataVolume" label="数据量" width="70" align="center">
          <template #default="{ row }">
            <span class="cell-cyan">{{ row.dataVolume }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="deadline" label="填报截止时间" width="100" align="center">
          <template #default="{ row }">
            <div>{{ row.deadline }}</div>
            <span v-if="row.urgent" class="urgent-tag">明日截止</span>
          </template>
        </el-table-column>
        <!-- 任务状态列暂时隐藏：恢复时把 v-if="false" 去掉即可 -->
        <el-table-column v-if="false" prop="status" label="任务状态" width="90" align="center">
          <template #default="{ row }">
            <span class="status-tag status-teal">{{ row.status }}</span>
          </template>
        </el-table-column>
      </el-table>
      <div class="dialog-pagination">
        <span class="page-total">共 {{ pageTotal }} 条数据</span>
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="pageTotal"
          layout="sizes, prev, pager, next"
          small
          background
        />
      </div>
    </el-dialog>

    <!-- 自治区数据表 / 基层精简保留清单 明细弹窗 -->
    <el-dialog
      v-model="showAutoDialog"
      :title="autoDialogTitle"
      width="1000px"
      :close-on-click-modal="false"
      class="dark_dialog"
    >
      <el-table :data="autoPageList" size="small" height="420" class="report-dialog-table">
        <el-table-column type="index" :index="autoIndexOffset" label="序号" width="60" align="center" />
        <el-table-column prop="name" label="数据表名称" min-width="240" show-overflow-tooltip />
        <el-table-column prop="dept" label="发布部门名称" width="210" show-overflow-tooltip />
        <el-table-column prop="cycle" label="填报周期" width="90" align="center" />
        <el-table-column prop="dataTotal" :label="autoDataLabel" width="100" align="center">
          <template #default="{ row }">
            <span class="cell-cyan">{{ row.dataTotal }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="time" :label="autoTimeLabel" width="110" align="center" />
      </el-table>
      <div class="dialog-pagination">
        <span class="page-total">共 {{ autoList.length }} 条记录</span>
        <el-pagination
          v-model:current-page="autoPage"
          v-model:page-size="autoPageSize"
          :page-sizes="[10, 20, 50]"
          :total="autoList.length"
          layout="sizes, prev, pager, next"
          small
          background
        />
      </div>
    </el-dialog>

    <div
      v-loading="regionDataLoading"
      element-loading-text="填报率加载中..."
      element-loading-background="rgba(3, 10, 28, 0.38)"
      class="center-mid panel"
    >
      <div class="panel-title">
        <span class="panel-title-text">数据填报率</span>
      </div>
      <div class="radar-wrap">
        <div class="radar-desc">
          <div class="radar-metric-list">
            <div
              v-for="item in radarMetricCards"
              :key="item.key"
              class="radar-desc-item"
            >
              <span class="radar-item-badge" :style="{ background: item.accent }">{{ item.shortName }}</span>
              <div class="radar-item-info">
                <span class="radar-item-label">{{ item.labelMain }}</span>
                <span class="radar-item-sub">
                  <span class="radar-item-label">{{ item.labelSub }}</span>
                  <span class="radar-item-value" :style="{ color: item.accent }">{{ item.valueText }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
        <div class="radar-chart-panel">
          <div class="radar-chart-glow"></div>
          <div ref="radarRef" class="chart-radar"></div>
        </div>
      </div>
    </div>

    <div
      v-loading="regionDataLoading"
      element-loading-text="基础数据加载中..."
      element-loading-background="rgba(3, 10, 28, 0.38)"
      class="center-bottom panel"
    >
      <div class="panel-title">
        <span class="panel-title-text">基层治理情况</span>
        <div class="dashboard-tabs">
          <span
            v-for="tab in entityTabs"
            :key="tab.key"
            class="dashboard-tab"
            :class="{ active: entityTab === tab.key }"
            @click="entityTab = tab.key"
          >{{ tab.label }}</span>
        </div>
      </div>

      <div class="entity-content">
        <div class="entity-info">
          <div class="stat-card">
            <div class="label">治理总数</div>
            <div class="value">{{ currentEntity.total }}</div>
          </div>
          <div v-show="entityTab === 'ren'" class="stat-card">
            <div class="label">标签总数</div>
            <div class="value">{{ entityTab === 'ren' ? currentEntity.tagTotal : currentEntity.typeStats.length + '类' }}</div>
          </div>
        </div>

        <div class="entity-charts" :class="{ 'entity-charts--single': !showEntityCategoryPanel }">
          <div ref="entityTrendRef" class="chart-entity-trend"></div>
          <div v-show="showEntityCategoryPanel" ref="wordCloudRef" class="chart-wordcloud"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import 'echarts-wordcloud'
import { useScaledData, useRegionData } from '../composables/useRegionData'
import { useDashboardApi } from '../composables/useDashboardApi'

const { reportData, fillRateData, entityData, fetchDetailList } = useScaledData()
const { selectedRegion, scaleVersion } = useRegionData()
const { regionDataLoading, globalDataLoading, autonomousFillCount, simplifyFillCount } = useDashboardApi()

const dpr = window.devicePixelRatio || 1

// Report tab
const currentReport = computed(() => reportData.value.national)
const reportSummaryCards = computed(() => ([
  { key: 'reportTotal', label: '报表总数', value: currentReport.value.reportTotal, detailType: 'report' as const },
  { key: 'taskTotal', label: '任务总数', value: currentReport.value.taskTotal, detailType: 'task' as const },
  { key: 'quantityTotal', label: '数据总量', value: currentReport.value.quantityTotal }
]))

// Report detail dialog
const showReportDialog = ref(false)
const reportDialogTitle = ref('')
const reportDialogType = ref<'report' | 'task'>('report')

// 分页（走接口：国家报表=全量前端分页 / 国家任务=接口分页 / 自治区=本地 mock）
const currentPage = ref(1)
const pageSize = ref(10)
const dialogList = ref<any[]>([])
const pageTotal = ref(0)
const dialogLoading = ref(false)

const loadDetail = async () => {
  dialogLoading.value = true
  try {
    const res = await fetchDetailList({
      tab: 'national',
      type: reportDialogType.value,
      pageNum: currentPage.value,
      pageSize: pageSize.value
    })
    dialogList.value = res.list
    pageTotal.value = res.total
  } finally {
    dialogLoading.value = false
  }
}

const openReportDetail = (type: 'report' | 'task') => {
  reportDialogType.value = type
  reportDialogTitle.value = '国家' + (type === 'report' ? '报表明细' : '任务明细')
  showReportDialog.value = true
  // 页码变化会触发 watch 拉取；若已在第 1 页则直接拉取
  if (currentPage.value !== 1) currentPage.value = 1
  else loadDetail()
}

watch(currentPage, () => {
  if (showReportDialog.value) loadDetail()
})

watch(pageSize, () => {
  if (!showReportDialog.value) return
  if (currentPage.value !== 1) currentPage.value = 1
  else loadDetail()
})

const statusClass = (status: string) => {
  if (status === '已建表') return 'status-green'
  if (status === '待签收') return 'status-orange'
  if (status === '待审核') return 'status-blue'
  if (status === '待填报') return 'status-blue'
  if (status === '已签收') return 'status-teal'
  return 'status-blue'
}

/* ---------------- 自治区报表（getFillCount：isExtended=false 数据表 / true 精简保留清单） ---------------- */
const reportTabs = [
  { key: 'national', label: '国家报表' },
  { key: 'autonomous', label: '自治区报表' }
] as const
const reportTab = ref<'national' | 'autonomous'>('national')

const autoTabs = [
  { key: 'data', label: '自治区数据表' },
  { key: 'simplify', label: '基层精简保留清单' }
] as const
const autoTab = ref<'data' | 'simplify'>('data')

const autoRaw = computed(() =>
  autoTab.value === 'data' ? autonomousFillCount.value : simplifyFillCount.value
)
const autoHasData = computed(() => !!autoRaw.value)

/** 累计数据量：万级换算成「万」，与 dapin 端口径一致 */
const formatVolumeText = (value: number) => {
  const num = Number(value) || 0
  if (num >= 10000) {
    const wan = num / 10000
    return `${Number.isInteger(wan) ? wan : wan.toFixed(1)}万`
  }
  return String(num)
}

const autoCards = computed(() => {
  const raw = autoRaw.value
  const isData = autoTab.value === 'data'
  const countLabel = isData ? '数据表总数' : '基层扩展表'
  const volumeLabel = isData ? '累计数据总量' : '累计填报数据'
  if (!raw) {
    return [
      { key: 'count', label: countLabel, value: '—', unit: '' },
      { key: 'volume', label: volumeLabel, value: '—', unit: '' },
      { key: 'issue', label: '涉及下发部门总数', value: '—', unit: '' }
    ]
  }
  const volumeNum = Number(raw.ledgerDataCount ?? 0)
  return [
    { key: 'count', label: countLabel, value: String(raw.ledgerCount ?? 0), unit: '张' },
    {
      key: 'volume',
      label: volumeLabel,
      value: formatVolumeText(volumeNum),
      unit: volumeNum >= 10000 ? '' : '条'
    },
    { key: 'issue', label: '涉及下发部门总数', value: String(raw.ledgerIssueCount ?? 0), unit: '' }
  ]
})

/** { 名称: 数量 } → 图表数据（按数量降序） */
const toDistList = (map: Record<string, number> | undefined) =>
  Object.entries(map ?? {})
    .map(([name, value]) => ({ name, value: Number(value) || 0 }))
    .sort((a, b) => b.value - a.value)

const autoDist = computed(() => toDistList(autoRaw.value?.deptLedgerCount))
const autoCycle = computed(() => toDistList(autoRaw.value?.cycleLedgerCount))

const autoBarRef = ref<HTMLElement | null>(null)
const autoDonutRef = ref<HTMLElement | null>(null)
let autoBarChart: echarts.ECharts | null = null
let autoDonutChart: echarts.ECharts | null = null

const AUTO_DONUT_COLORS = ['#40e0ff', '#5dd39e', '#f5a623', '#9b8cff', '#ff7a6b', '#4ea1ff']

const renderAutoCharts = () => {
  if (reportTab.value !== 'autonomous') return
  if (autoBarRef.value) {
    autoBarChart = autoBarChart || echarts.init(autoBarRef.value, undefined, { devicePixelRatio: dpr })
    autoBarChart.setOption(
      {
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          formatter: (params: any) => {
            const p = Array.isArray(params) ? params[0] : params
            if (!p) return ''
            return `${p.name}<br/>报表数：${p.value} 张`
          }
        },
        grid: { top: 6, right: 30, bottom: 4, left: 10, containLabel: true },
        dataZoom: [
          {
            type: 'inside',
            yAxisIndex: 0,
            startValue: 0,
            endValue: Math.min(7, Math.max(2, autoDist.value.length - 1)),
            zoomOnMouseWheel: false,
            moveOnMouseWheel: true,
            moveOnMouseMove: true,
            filterMode: 'filter'
          }
        ],
        xAxis: {
          type: 'value',
          axisLine: { lineStyle: { color: 'rgba(64,158,255,0.2)' } },
          axisLabel: { color: '#7a93c4', fontSize: 12, formatter: '{value}张' },
          minInterval: 1,
          splitLine: { lineStyle: { color: 'rgba(64,158,255,0.08)' } }
        },
        yAxis: {
          type: 'category',
          inverse: true,
          data: autoDist.value.map((d) => d.name),
          axisLine: { lineStyle: { color: 'rgba(64,158,255,0.2)' } },
          axisTick: { show: false },
          axisLabel: {
            color: '#a9c8f5',
            fontSize: 12,
            width: 130,
            margin: 10,
            overflow: 'truncate',
            align: 'right',
            verticalAlign: 'middle'
          },
          splitLine: { show: false }
        },
        series: [
          {
            type: 'bar',
            data: autoDist.value.map((d) => d.value),
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: '#1a6cff' },
                { offset: 1, color: '#40e0ff' }
              ]),
              borderRadius: [0, 4, 4, 0]
            },
            barMaxWidth: 11,
            label: {
              show: true,
              position: 'right',
              color: '#40e0ff',
              fontSize: 12,
              formatter: '{c}张'
            }
          }
        ]
      },
      true
    )
  }
  if (autoDonutRef.value) {
    autoDonutChart = autoDonutChart || echarts.init(autoDonutRef.value, undefined, { devicePixelRatio: dpr })
    autoDonutChart.setOption(
      {
        tooltip: { trigger: 'item', formatter: '{b}: {c}' },
        series: [
          {
            type: 'pie',
            center: ['50%', '50%'],
            radius: ['40%', '66%'],
            label: { color: '#a9c8f5', fontSize: 12, formatter: '{b}\n{c}' },
            labelLine: { length: 6, length2: 6, lineStyle: { color: 'rgba(64,158,255,0.3)' } },
            itemStyle: { borderColor: 'rgba(8,16,38,0.95)', borderWidth: 2 },
            data: autoCycle.value.map((d, i) => ({
              ...d,
              itemStyle: { color: AUTO_DONUT_COLORS[i % AUTO_DONUT_COLORS.length] }
            }))
          }
        ]
      },
      true
    )
  }
}

/** 切页签时容器会随 v-if 销毁重建，旧实例必须先释放再重建 */
watch([reportTab, autoTab], () => {
  autoBarChart?.dispose()
  autoBarChart = null
  autoDonutChart?.dispose()
  autoDonutChart = null
  nextTick(() => renderAutoCharts())
})

watch([autonomousFillCount, simplifyFillCount], () => nextTick(() => renderAutoCharts()), { deep: true })

/* 自治区明细弹窗（ledgerListInfo 全量前端分页） */
const showAutoDialog = ref(false)
const autoPage = ref(1)
const autoPageSize = ref(10)
const autoDialogTitle = computed(() =>
  autoTab.value === 'data' ? '自治区数据表明细' : '基层精简保留清单明细'
)
const autoDataLabel = computed(() => (autoTab.value === 'data' ? '数据总量' : '数据量'))
const autoTimeLabel = computed(() => (autoTab.value === 'data' ? '下发时间' : '发布时间'))

const autoList = computed(() =>
  (autoRaw.value?.ledgerListInfo ?? []).map((item) => ({
    name: item.ledgerName ?? '',
    dept: item.orgName ?? '',
    cycle: item.reportCycleName ?? '--',
    dataTotal: String(item.dataTotal ?? 0),
    time: item.lastOnlieTime ?? item.lastOnlineTime ?? '--'
  }))
)

const autoPageList = computed(() =>
  autoList.value.slice((autoPage.value - 1) * autoPageSize.value, autoPage.value * autoPageSize.value)
)

/** 翻页后序号接着上一页排，而不是每页都从 1 开始 */
const autoIndexOffset = computed(() => (autoPage.value - 1) * autoPageSize.value + 1)

const openAutoDetail = () => {
  if (!autoRaw.value) return
  showAutoDialog.value = true
  if (autoPage.value !== 1) autoPage.value = 1
}

// Entity Tab
const entityTabs = [
  { key: 'ren', label: '人' },
  { key: 'fang', label: '房' },
  { key: 'qi', label: '企' },
  { key: 'changsuo', label: '场所' }
]
const entityTab = ref('ren')
/** 词云标签只取最后一个「/」后的文字，如 劳动保障/低保户 → 低保户；无斜杠原样返回 */
function lastTagSegment(name: string): string {
  const idx = Math.max(name.lastIndexOf('/'), name.lastIndexOf('／'))
  if (idx === -1) return name
  const tail = name.slice(idx + 1).trim()
  return tail || name
}

const emptyEntity = {
  total: '--',
  tagTotal: '--',
  governanceTrend: [] as number[],
  completionRates: [] as number[],
  axisLabels: [] as string[],
  cloudWords: [] as Array<{ name: string; value: number }>,
  typeStats: [] as Array<{ name: string; value: number }>,
  pieGroups: [] as Array<{ title: string; data: Array<{ name: string; value: number }> }>
}
const currentEntity = computed(() => {
  const entity = (entityData.value as Record<string, unknown> | undefined)?.[entityTab.value] as Record<string, unknown> | undefined
  if (!entity) return emptyEntity
  return {
    ...emptyEntity,
    ...entity,
    governanceTrend: Array.isArray(entity.governanceTrend) ? entity.governanceTrend as number[] : [],
    completionRates: Array.isArray(entity.completionRates) ? entity.completionRates as number[] : [],
    axisLabels: Array.isArray(entity.axisLabels) ? entity.axisLabels as string[] : [],
    // 词云最多展示前 20 个标签
    cloudWords: Array.isArray(entity.cloudWords)
      ? (entity.cloudWords as Array<{ name: string; value: number }>)
          .slice(0, 20)
          .map((w) => ({ ...w, name: lastTagSegment(w.name) }))
      : [],
    typeStats: Array.isArray(entity.typeStats)
      ? entity.typeStats as Array<{ name: string; value: number }>
      : [],
    pieGroups: Array.isArray(entity.pieGroups)
      ? entity.pieGroups as Array<{ title: string; data: Array<{ name: string; value: number }> }>
      : []
  }
})
const entityPieConfig = computed(() => {
  // 接口模式：由适配层给出 pieGroups；否则回退本地 mock 的硬编码分布
  const groups = currentEntity.value.pieGroups as
    | Array<{ title: string; data: Array<{ name: string; value: number }> }>
    | undefined

  // 企业分类数据暂未提供，先隐藏「企业类型分布」图
  const visibleGroups = (groups ?? []).filter((group) => !group.title.includes('企业'))

  if (visibleGroups.length) {
    const many = visibleGroups.length > 1
    return {
      titles: visibleGroups.map((group, index) => ({
        text: group.title,
        left: many ? (index === 0 ? '27%' : '73%') : 'center',
        top: many ? 30 : 6
      })),
      series: visibleGroups.map((group, index) => ({
        name: group.title,
        center: many ? [index === 0 ? '27%' : '73%', '62%'] : ['50%', '58%'],
        radius: many ? ['32%', '50%'] : ['36%', '56%'],
        data: group.data
      }))
    }
  }

  if (entityTab.value === 'fang') {
    return {
      titles: [
        { text: '主要标签分布情况', left: 'center', top: 6 },
        { text: '居住状态分布', left: '22%', top: 30 },
        { text: '房屋类型分布', left: '68%', top: 30 }
      ],
      series: [
        {
          name: '居住状态分布',
          center: ['27%', '62%'],
          radius: ['32%', '50%'],
          data: [
            { name: '自住房', value: 38 },
            { name: '出租房', value: 26 },
            { name: '空置房', value: 14 },
            { name: '其他', value: 8 }
          ]
        },
        {
          name: '房屋类型分布',
          center: ['73%', '62%'],
          radius: ['32%', '50%'],
          data: [
            { name: '楼房', value: 48 },
            { name: '平房', value: 22 },
            { name: '其他', value: 9 }
          ]
        }
      ]
    }
  }

  if (entityTab.value === 'qi') {
    // 企业分类数据暂未提供，先隐藏「企业类型分布」图
    return { titles: [], series: [] }
  }

  return {
    titles: [{ text: '场所类型分布情况', left: 'center', top: 6 }],
    series: [
      {
        name: '场所类型分布情况',
        center: ['50%', '58%'],
        radius: ['36%', '56%'],
        data: [
          { name: '小商店', value: 66 },
          { name: '小医院', value: 18 },
          { name: '小旅馆', value: 20 },
          { name: '小餐饮场所', value: 54 },
          { name: '小歌舞厅娱乐场所', value: 12 },
          { name: '小网吧', value: 9 },
          { name: '小美容洗浴场所', value: 14 },
          { name: '小生产加工企业', value: 11 },
          { name: '小学校或幼儿园', value: 24 },
          { name: '其他', value: 8 }
        ]
      }
    ]
  }
})
const showEntityCategoryPanel = computed(() => !(entityTab.value === 'qi' && !entityPieConfig.value.series.length))

const radarMetrics = computed(() => {
  const allMetrics = [
    { key: 'autonomous', label: '自治区级部门填报率', shortName: '自治区', value: fillRateData.value.autonomous },
    { key: 'city', label: '盟市级部门填报率', shortName: '盟市', value: fillRateData.value.city },
    { key: 'county', label: '旗县区部门填报率', shortName: '旗县区', value: fillRateData.value.county },
    { key: 'township', label: '镇街（苏木）填报率', shortName: '镇街', value: fillRateData.value.township },
    { key: 'village', label: '村社（嘎查）填报率', shortName: '村社', value: fillRateData.value.village }
  ]

  // 区划层级决定展示条数：自治区 5 条 / 盟市 4 条（去掉自治区级）/ 旗县区 3 条（再去掉盟市级）
  if (selectedRegion.value.length <= 1) return allMetrics
  if (selectedRegion.value.length === 2) return allMetrics.slice(1)
  return allMetrics.slice(2)
})

const radarAccentColors = ['#40e0ff', '#5dd39e', '#8a7dff', '#f5a623', '#4ea1ff']

const clampPercent = (value: number) => {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

const formatPercentText = (value: unknown, digits = 2) => {
  if (typeof value === 'string' && value.trim().endsWith('%')) return value.trim()
  const numeric = clampPercent(Number(value))
  return `${numeric.toFixed(digits)}%`
}

/** 标签拆两行：末尾的「填报率」放到第二行，与数值同行 */
const splitFillLabel = (label: string) => {
  const suffix = '填报率'
  return label.endsWith(suffix)
    ? { labelMain: label.slice(0, -suffix.length), labelSub: suffix }
    : { labelMain: label, labelSub: '' }
}

const radarMetricCards = computed(() => radarMetrics.value.map((item, index) => {
  const percent = clampPercent(Number(item.value))
  return {
    ...item,
    ...splitFillLabel(item.label),
    accent: radarAccentColors[index % radarAccentColors.length],
    valueNum: percent,
    valueText: formatPercentText(percent)
  }
}))

// Chart refs
const distributionRef = ref<HTMLElement | null>(null)
const radarRef = ref<HTMLElement | null>(null)
const entityTrendRef = ref<HTMLElement | null>(null)
const wordCloudRef = ref<HTMLElement | null>(null)

let distributionChart: echarts.ECharts | null = null
let radarChart: echarts.ECharts | null = null
let entityTrendChart: echarts.ECharts | null = null
let wordCloudChart: echarts.ECharts | null = null

const formatAxisCount = (value: number) => {
  const num = Number(value)
  if (Number.isNaN(num)) return String(value)
  if (Math.abs(num) >= 10000) {
    const wan = num / 10000
    return `${Number.isInteger(wan) ? wan : wan.toFixed(1)}万`
  }
  return num.toLocaleString()
}

const truncateAxisLabel = (label: string, max = 5) => (
  label.length > max ? `${label.slice(0, max)}...` : label
)

/** 完成率轴刻度固定 0-100（完成率语义上不超 100，异常数据不允许把刻度顶到 110） */
const calcPercentAxisMax = (_values: number[]) => 100

/** 报表概览图可视区域条数，超出部分通过滚轮上下查看 */
const DISTRIBUTION_VISIBLE_COUNT = 5

// Distribution bar chart
const initDistribution = () => {
  if (!distributionRef.value) return
  distributionChart = echarts.init(distributionRef.value, undefined, { devicePixelRatio: dpr })
  updateDistribution()
}

const updateDistribution = () => {
  if (!distributionChart) return
  const distribution = currentReport.value.distribution
  if (!distribution.series.length) {
    distributionChart.clear()
    return
  }
  const multiSeries = distribution.series.length > 1
  distributionChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      show: multiSeries,
      data: distribution.series.map((item) => item.name),
      textStyle: { color: '#7a93c4', fontSize: 13 },
      top: 0,
      right: 0,
      itemWidth: 12,
      itemHeight: 9
    },
    dataZoom: [
      {
        type: 'inside',
        yAxisIndex: 0,
        startValue: 0,
        endValue: DISTRIBUTION_VISIBLE_COUNT - 1,
        // 不能设 zoomLock：开启后 echarts 只绑定拖拽、不绑定 wheel，滚轮会完全失效
        zoomOnMouseWheel: false,
        moveOnMouseWheel: true,
        moveOnMouseMove: true,
        filterMode: 'filter'
      }
    ],
    grid: {
      top: multiSeries ? 24 : 10,
      right: 26,
      bottom: 14,
      left: 10,
      containLabel: true
    },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: 'rgba(64,158,255,0.2)' } },
      axisLabel: {
        color: '#7a93c4',
        fontSize: 12,
        margin: 8,
        formatter: (value: number) => formatAxisCount(value)
      },
      minInterval: 1,
      splitLine: { lineStyle: { color: 'rgba(64,158,255,0.08)' } }
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: distribution.categories,
      axisLine: { lineStyle: { color: 'rgba(64,158,255,0.2)' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#7a93c4',
        fontSize: 12,
        margin: 10,
        rotate: 0,
        align: 'right',
        verticalAlign: 'middle',
        width: 120,
        overflow: 'truncate'
      },
      splitLine: { show: false }
    },
    series: distribution.series.map((series) => ({
      name: series.name,
      type: 'bar',
      data: series.data,
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
          { offset: 0, color: series.color[0] },
          { offset: 1, color: series.color[1] }
        ]),
        borderRadius: [0, 4, 4, 0]
      },
      barMaxWidth: multiSeries ? 12 : 16,
      barGap: '40%',
      barCategoryGap: multiSeries ? '38%' : '46%',
      label: {
        show: !multiSeries,
        position: 'right',
        color: series.color[1],
        fontSize: 12,
        distance: 4
      }
    }))
  }, true)
}

watch(selectedRegion, () => {
  nextTick(() => updateAllCharts())
}, { deep: true })

watch(scaleVersion, () => {
  resizeAll()
})

// Radar (triangle)
const initRadar = () => {
  if (!radarRef.value) return
  radarChart = echarts.init(radarRef.value, undefined, { devicePixelRatio: dpr })
  updateRadar()
}

const updateRadar = () => {
  if (!radarChart) return
  const indicators = radarMetrics.value.map(item => ({
    name: item.shortName,
    max: 100
  }))
  const values = radarMetrics.value.map(item => item.value)

  radarChart.setOption({
    tooltip: {
      trigger: 'item',
      formatter: () => {
        const rows = radarMetrics.value.map((item) => (
          `${item.shortName}：${formatPercentText(item.value)}`
        ))
        return [`填报率`, ...rows].join('<br/>')
      }
    },
    radar: {
      center: ['56%', '54%'],
      radius: '60%',
      indicator: indicators,
      shape: 'polygon',
      splitNumber: 4,
      axisName: {
        color: '#7a93c4',
        fontSize: 13,
        fontWeight: 'bold'
      },
      splitLine: { lineStyle: { color: 'rgba(64,158,255,0.2)' } },
      splitArea: {
        areaStyle: {
          color: ['rgba(64,158,255,0.05)', 'rgba(64,158,255,0.09)', 'rgba(64,158,255,0.13)', 'rgba(64,158,255,0.18)']
        }
      },
      axisLine: { lineStyle: { color: 'rgba(64,158,255,0.3)' } }
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: values,
            name: '填报率',
            itemStyle: { color: '#40e0ff' },
            lineStyle: { color: '#40e0ff', width: 3 },
            areaStyle: {
              color: new echarts.graphic.RadialGradient(0.5, 0.5, 1, [
                { offset: 0, color: 'rgba(64,224,255,0.48)' },
                { offset: 1, color: 'rgba(64,224,255,0.12)' }
              ])
            },
            symbol: 'circle',
            symbolSize: 8,
            label: {
              show: false,
              formatter: (p: any) => `${p.value}%`,
              color: '#40e0ff',
              fontWeight: 'bold',
              fontSize: 10
            }
          }
        ]
      }
    ]
  })
}

// 基层治理情况图表：完善率暂时隐藏（改回 true 即恢复折线 + 右侧百分比轴）
const SHOW_COMPLETION_TREND = false

// Entity trend chart
const initEntityTrend = () => {
  if (!entityTrendRef.value) return
  entityTrendChart = echarts.init(entityTrendRef.value, undefined, { devicePixelRatio: dpr })
  updateEntityTrend()
}

const updateEntityTrend = () => {
  if (!entityTrendChart) return
  const data = currentEntity.value
  const axisLabels = data.axisLabels ?? []
  const governanceTrend = data.governanceTrend ?? []
  const completionRates = (data.completionRates ?? []).map((v) => Math.min(Number(v) || 0, 100))
  const percentAxisMax = calcPercentAxisMax(completionRates)
  entityTrendChart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const rows = Array.isArray(params) ? params : [params]
        const title = rows[0]?.axisValueLabel ?? rows[0]?.name ?? ''
        const lines = rows.map((item: any) => {
          const isPercent = String(item.seriesName ?? '').includes('率')
          const valueText = isPercent ? formatPercentText(item.value, 2) : formatAxisCount(Number(item.value))
          return `${item.marker}${item.seriesName}　${valueText}`
        })
        return [title, ...lines].join('<br/>')
      }
    },
    legend: {
      data: SHOW_COMPLETION_TREND ? ['基层治理量', '完善率'] : ['基层治理量'],
      textStyle: { color: '#7a93c4', fontSize: 13 },
      top: 0,
      left: 'center',
      itemGap: 20,
      itemWidth: 10,
      itemHeight: 8
    },
    grid: { top: 32, right: 14, bottom: 26, left: 14, containLabel: true },
    xAxis: {
      type: 'category',
      data: axisLabels,
      axisLine: { lineStyle: { color: 'rgba(64,158,255,0.2)' } },
      axisLabel: {
        color: '#7a93c4',
        fontSize: 11,
        interval: 0,
        rotate: 26,
        margin: 6,
        formatter: (value: string) => truncateAxisLabel(value, 4)
      }
    },
    yAxis: [
      {
        type: 'value',
        axisLine: { show: false },
        axisLabel: { color: '#7a93c4', fontSize: 12, formatter: (value: number) => formatAxisCount(value) },
        splitLine: { lineStyle: { color: 'rgba(64,158,255,0.08)' } }
      },
      ...(SHOW_COMPLETION_TREND
        ? [{
            type: 'value',
            min: 0,
            max: percentAxisMax,
            axisLine: { show: false },
            axisLabel: { color: '#7a93c4', fontSize: 12, formatter: '{value}%' },
            splitLine: { show: false }
          }]
        : [])
    ],
    series: [
      {
        name: '基层治理量',
        type: 'bar',
        data: governanceTrend,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#67c23a' },
            { offset: 1, color: 'rgba(103,194,58,0.2)' }
          ]),
          borderRadius: [2, 2, 0, 0]
        },
        barWidth: 10
      },
      ...(SHOW_COMPLETION_TREND
        ? [{
            name: '完善率',
            type: 'line',
            yAxisIndex: 1,
            data: completionRates,
            smooth: 0.25,
            itemStyle: { color: '#f5a623' },
            lineStyle: { width: 2 },
            symbol: 'circle',
            symbolSize: 6,
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(245,166,35,0.3)' },
                { offset: 1, color: 'rgba(245,166,35,0.05)' }
              ])
            }
          }]
        : [])
    ]
  }, true)
}

watch(entityTab, () => {
  nextTick(() => {
    updateEntityTrend()
    updateWordCloud()
    resizeAll()
  })
})

// Word cloud
const initWordCloud = () => {
  if (!wordCloudRef.value) return
  wordCloudChart = echarts.init(wordCloudRef.value, undefined, { devicePixelRatio: dpr })
  updateWordCloud()
}

const updateWordCloud = () => {
  if (!wordCloudChart) return
  if (!showEntityCategoryPanel.value) {
    wordCloudChart.clear()
    return
  }
  if (entityTab.value === 'ren') {
    const words = currentEntity.value.cloudWords
    wordCloudChart.setOption({
      tooltip: {},
      title: [],
      graphic: [],
      series: [
        {
          type: 'wordCloud',
          shape: 'circle',
          left: 'center',
          top: 'center',
          width: '95%',
          height: '95%',
          sizeRange: [12, 30],
          rotationRange: [-30, 30],
          rotationStep: 15,
          gridSize: 8,
          drawOutOfBound: false,
          textStyle: {
            fontFamily: 'Microsoft YaHei',
            fontWeight: 'bold',
            color: () => {
              const colors = ['#40e0ff', '#5dd39e', '#409eff', '#6ab7ff', '#3da5d9', '#5fc9a8']
              return colors[Math.floor(Math.random() * colors.length)]
            }
          },
          emphasis: {
            textStyle: {
              textShadowBlur: 10,
              textShadowColor: '#fff'
            }
          },
          data: words
        }
      ]
    }, true)
    return
  }

  const pieColors = ['#40e0ff', '#5dd39e', '#409eff', '#6ab7ff', '#f5a623', '#9b8cff', '#1ed1a8', '#5b8ff9', '#30bf78', '#ffd166']

  // 企业分类数据暂未提供：清空图表并展示空状态
  if (!entityPieConfig.value.series.length) {
    wordCloudChart.clear()
    wordCloudChart.setOption({
      title: [],
      series: [],
      graphic: [{
        type: 'text',
        left: 'center',
        top: 'middle',
        style: { text: '暂无数据', fill: '#7a93c4', fontSize: 12 }
      }]
    }, true)
    return
  }

  wordCloudChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c}' },
    title: entityPieConfig.value.titles.map(item => ({
      ...item,
      textStyle: { color: '#7a93c4', fontSize: 12, fontWeight: 'normal' }
    })),
    graphic: [],
    series: entityPieConfig.value.series.map((series, index) => ({
      name: series.name,
      type: 'pie',
      center: series.center,
      radius: series.radius,
      avoidLabelOverlap: true,
      label: {
        color: '#7a93c4',
        fontSize: 10,
        formatter: '{b}'
      },
      labelLine: {
        lineStyle: { color: 'rgba(64,158,255,0.25)' }
      },
      itemStyle: {
        borderColor: 'rgba(8, 16, 38, 0.95)',
        borderWidth: 2
      },
      data: series.data.map((item: any, itemIndex: number) => ({
        ...item,
        itemStyle: { color: pieColors[itemIndex % pieColors.length] }
      }))
    }))
  }, true)
}

const updateAllCharts = () => {
  updateDistribution()
  updateRadar()
  updateEntityTrend()
  updateWordCloud()
}

const resizeAll = () => {
  distributionChart?.resize()
  radarChart?.resize()
  entityTrendChart?.resize()
  wordCloudChart?.resize()
  autoBarChart?.resize()
  autoDonutChart?.resize()
}

// 接口数据回填后刷新图表
watch(reportData, () => nextTick(() => updateDistribution()), { deep: true })
watch(fillRateData, () => nextTick(() => updateRadar()), { deep: true })
watch(entityData, () => nextTick(() => {
  updateEntityTrend()
  updateWordCloud()
}), { deep: true })

let resizeHandler: (() => void) | null = null
let ro: ResizeObserver | null = null

onMounted(() => {
  nextTick(() => {
    initDistribution()
    initRadar()
    initEntityTrend()
    initWordCloud()
  })
  resizeHandler = () => resizeAll()
  window.addEventListener('resize', resizeHandler)
  ro = new ResizeObserver(() => resizeAll())
  ;[distributionRef.value, radarRef.value, entityTrendRef.value, wordCloudRef.value].forEach(el => el && ro!.observe(el))
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeHandler!)
  ro?.disconnect()
  distributionChart?.dispose()
  radarChart?.dispose()
  entityTrendChart?.dispose()
  wordCloudChart?.dispose()
  autoBarChart?.dispose()
  autoDonutChart?.dispose()
})
</script>

<style scoped>
.center-panel-root {
  display: flex;
  flex-direction: column;
  gap: var(--dashboard-gap, 10px);
  flex: 1 1 auto;
  height: 100%;
  min-height: 0;
}

.center-top {
  flex: 0.94 1 0;
  min-height: var(--center-top-min-height, 184px);
  display: flex;
  flex-direction: column;
}

.center-mid {
  flex: 0.72 1 0;
  min-height: var(--center-mid-min-height, 150px);
  display: flex;
  flex-direction: column;
}

.center-bottom {
  flex: 1.18 1 0;
  display: flex;
  flex-direction: column;
  min-height: var(--center-bottom-min-height, 270px);
}

/* 报表内容 */
.report-content {
  display: flex;
  gap: var(--dashboard-gap, 10px);
  flex: 1;
  min-height: 118px;
}

.report-card-list {
  flex: 0 0 var(--report-card-list-width, 258px);
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  /* 行高自动均分可用高度：卡片数量随层级变化（8/6 张）都不出滚动条 */
  grid-auto-rows: minmax(0, 1fr);
  gap: 4px;
  overflow: hidden;
}

.report-card {
  background: var(--c-card-bg, rgba(30, 50, 100, 0.35));
  border: 1px solid var(--c-border, rgba(64, 158, 255, 0.25));
  border-radius: 3px;
  padding: 4px 6px;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  min-height: 0;
  overflow: hidden;
}

.rc-label {
  font-size: 13px;
  color: var(--c-text, #c8d6f5);
  line-height: 1.3;
}

.rc-value {
  font-size: 19px;
  font-weight: bold;
  color: var(--c-cyan, #40e0ff);
  font-family: 'DIN', 'Consolas', monospace;
  line-height: 1.2;
  white-space: nowrap;
}

/* 数据总量等长数字（如 178,410,879）自动缩字号，避免溢出卡片 */
.rc-value-long {
  font-size: 14px;
  letter-spacing: -0.2px;
}

.rc-value.primary { color: #40e0ff; }

.rc-value.warning { color: #f5a623; }

.rc-value.success { color: var(--c-green, #5dd39e); }

.click-hint {
  display: inline-block;
  margin-left: 4px;
  color: #40e0ff;
  font-size: 12px;
}

.report-card.clickable {
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.report-card.clickable:hover {
  border-color: var(--c-cyan, #40e0ff);
  box-shadow: 0 0 8px rgba(64, 224, 255, 0.3);
}

.report-distribution {
  flex: 0.9;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.chart-distribution {
  width: 100%;
  flex: 1;
  min-height: 0;
}

/* 雷达图 */
.radar-wrap {
  flex: 1;
  min-height: var(--radar-wrap-min-height, 180px);
  display: flex;
  align-items: stretch;
  gap: 14px;
}

.radar-desc {
  flex: 0 0 var(--radar-desc-width, 460px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  font-size: 12px;
  color: var(--c-text, #c8d6f5);
}

.radar-metric-list {
  display: grid;
  /* 两列排布：5 条时上 3 下 2，最后一行靠左 */
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 8px;
  align-content: center;
  min-height: 0;
  overflow: hidden;
}

.radar-desc-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 7px;
  border-radius: 6px;
  border: 1px solid rgba(64, 158, 255, 0.18);
  background: rgba(8, 24, 58, 0.42);
}

.radar-item-badge {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  height: 18px;
  padding: 0 8px;
  border-radius: 999px;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
}

.radar-item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.radar-item-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #c8d6f5;
  font-size: 11px;
  line-height: 1.25;
}

.radar-item-sub {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.radar-item-value {
  flex: none;
  font-size: 15px;
  line-height: 1;
  font-weight: 700;
  font-family: 'DIN', 'Consolas', monospace;
}

.radar-chart-panel {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.radar-chart-glow {
  position: absolute;
  inset: 12% 8%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(64, 224, 255, 0.14) 0%, rgba(64, 224, 255, 0.04) 42%, rgba(64, 224, 255, 0) 72%);
  pointer-events: none;
}

.chart-radar {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  min-height: var(--radar-wrap-min-height, 180px);
}

/* 实体内容 */
.entity-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: calc(var(--dashboard-gap, 10px) - 2px);
  min-height: 0;
}

.entity-info {
  flex: 0 0 auto;
  display: flex;
  flex-direction: row;
  gap: calc(var(--dashboard-gap, 10px) - 2px);
}

.entity-info .stat-card {
  flex: 1;
  /* 标签和数值放同一行 */
  flex-direction: row;
  align-items: baseline;
  justify-content: center;
  gap: 10px;
}

.entity-info .stat-card .value {
  font-size: 18px;
}

.entity-charts {
  flex: 1;
  display: flex;
  gap: calc(var(--dashboard-gap, 10px) - 2px);
  min-width: 0;
  min-height: var(--entity-chart-min-height, 210px);
}

.entity-charts--single .chart-entity-trend {
  flex: 1 1 0;
}

.chart-entity-trend {
  flex: 1.15 1 0;
  min-width: 0;
  min-height: var(--entity-chart-min-height, 210px);
}

.chart-wordcloud {
  flex: 0.85 1 0;
  min-width: 0;
  min-height: var(--entity-chart-min-height, 210px);
}

/* 报表详情弹窗 */
.dark-dialog :deep(.el-dialog__body) {
  padding-top: 10px;
}

.dialog-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

.page-total {
  font-size: 12px;
  color: var(--c-text, #c8d6f5);
}

.cell-cyan {
  color: #40e0ff;
  font-weight: bold;
}

.row-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.action-link {
  color: #40e0ff;
  cursor: pointer;
  white-space: nowrap;
}

.action-link-muted {
  color: #7a93c4;
}

.urgent-tag {
  display: inline-block;
  margin-top: 2px;
  padding: 1px 6px;
  border-radius: 2px;
  font-size: 10px;
  color: #fff;
  background: #c2417a;
}

.status-teal {
  color: #35e0c2;
  background: rgba(53, 224, 194, 0.15);
  border: 1px solid rgba(53, 224, 194, 0.5);
}

.report-dialog-table {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: rgba(30, 50, 100, 0.5);
  --el-table-row-hover-bg-color: rgba(64, 158, 255, 0.12);
  --el-table-text-color: #cfe3ff;
  --el-table-header-text-color: #40e0ff;
  --el-table-border-color: rgba(64, 158, 255, 0.2);
}

.status-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 2px;
  font-size: 11px;
}

.status-green {
  color: #5dd39e;
  background: rgba(93, 211, 158, 0.15);
  border: 1px solid rgba(93, 211, 158, 0.4);
}

.status-orange {
  color: #f5a623;
  background: rgba(245, 166, 35, 0.15);
  border: 1px solid rgba(245, 166, 35, 0.4);
}

.status-blue {
  color: #409eff;
  background: rgba(64, 158, 255, 0.15);
  border: 1px solid rgba(64, 158, 255, 0.4);
}

/* ===== 自治区报表（getFillCount） ===== */
.auto-report {
  flex-direction: column;
  gap: 6px;
}

.auto-sub-tabs {
  flex: 0 0 auto;
  display: flex;
  gap: 8px;
}

.auto-sub-tab {
  padding: 4px 16px;
  font-size: 14px;
  font-weight: 600;
  color: #dceaff;
  background: rgba(18, 46, 90, 0.85);
  border: 1px solid rgba(64, 158, 255, 0.35);
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.2s;
}

.auto-sub-tab.active {
  color: #12244a;
  background: #ffe94a;
  border-color: #ffe94a;
}

.auto-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  gap: var(--dashboard-gap, 10px);
}

.auto-cards {
  flex: 0 0 190px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.auto-card {
  flex: 1 1 0;
  min-height: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: rgba(30, 50, 100, 0.45);
  border: 1px solid rgba(64, 158, 255, 0.35);
  border-radius: 4px;
}

.auto-card.clickable {
  cursor: pointer;
}

.auto-card.clickable:hover {
  border-color: rgba(64, 200, 255, 0.65);
  box-shadow: 0 0 10px rgba(64, 158, 255, 0.25);
}

.ac-label {
  font-size: 13px;
  color: #c8d6f5;
}

.ac-value {
  font-size: 18px;
  font-weight: bold;
  color: #40e0ff;
  font-family: 'DIN', 'Consolas', monospace;
}

.ac-unit {
  margin-left: 2px;
  font-size: 12px;
}

.ac-doc {
  position: absolute;
  right: 8px;
  top: 6px;
  font-size: 12px;
  opacity: 0.85;
}

.auto-chart-col {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* 精简保留清单没有分布情况图，环形图占满剩余宽度 */
.auto-body--simplify .auto-chart-col {
  flex: 1 1 auto;
}

.auto-chart-col--wide {
  flex: 1.5 1 0;
}

.auto-sec-title {
  flex: 0 0 auto;
  text-align: center;
  font-size: 14px;
  color: #40e0ff;
  letter-spacing: 2px;
  margin-bottom: 2px;
}

.auto-chart {
  flex: 1 1 0;
  min-height: 0;
}

.auto-chart--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7a93c4;
  font-size: 13px;
}
</style>
