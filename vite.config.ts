import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

/**
 * 可选后端地址（运行命令切换，无需改代码）：
 *   npm run dev:69      线上环境 10.8.21.69:80
 *   npm run dev:apiKey  开放接口模式（/open/v1 + appKey/appSecret 鉴权，参数放请求头）
 *   npm run dev         默认地址（同样是 10.8.21.69:80）
 *
 * 测试环境 10.8.21.79 已停用，所有模式统一走 69。
 * 需要临时换地址时用 VITE_API_TARGET 指定：
 *   $env:VITE_API_TARGET='http://x.x.x.x:80'; npm run dev:apiKey
 */
const API_TARGETS: Record<string, string> = {
  // 线上环境
  api69: 'http://10.8.21.69:80'
}

/** 默认后端地址（npm run dev / dev:apiKey）—— 线上环境 69 */
const DEFAULT_API_TARGET = 'http://10.8.21.69:80'

export default defineConfig(({ mode }) => {
  const override = process.env.VITE_API_TARGET
  const target = override || API_TARGETS[mode] || DEFAULT_API_TARGET
  console.log(`[vite] 接口代理目标：${target}${override ? '（来自 VITE_API_TARGET 环境变量覆盖）' : ''}`)
  // 79 测试环境已停用：一旦被误指向，启动时就报警，避免静默用错环境
  if (target.includes('10.8.21.79')) {
    console.warn('[vite] ⚠️ 代理目标指向已停用的 10.8.21.79，请改用 10.8.21.69（检查 VITE_API_TARGET 环境变量）')
  }
  if (mode === 'apiKey') {
    console.log('[vite] apiKey 模式：路径前缀 /open/v1，请求头携带 appKey + appSecret')
  }

  return {
    base: './',
    plugins: [vue()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      open: false,
      proxy: {
        // 大屏接口：/gdp-odr-nm/dataDashboard/xxx -> {target}/gdp-odr-nm/dataDashboard/xxx
        '/gdp-odr-nm': {
          target,
          changeOrigin: true
        }
      }
    }
  }
})
