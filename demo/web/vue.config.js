const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  outputDir: 'target/dist',
  configureWebpack: {
    devtool: "source-map"
  }
})
