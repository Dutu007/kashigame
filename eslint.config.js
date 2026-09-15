/**
 * ESLint 扁平配置（ESLint 9 及以上仅支持此形式）。
 *
 * 使用 typescript-eslint 的推荐规则集，并以 eslint-config-prettier 关闭
 * 所有与 Prettier 冲突的格式类规则，避免两个工具互相打架。
 */
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  {
    // 构建产物、依赖与美术资源目录不参与检查
    ignores: ['dist/**', 'node_modules/**', 'assets/**'],
  },
  ...tseslint.configs.recommended,
  prettier,
)
