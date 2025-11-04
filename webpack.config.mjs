import path from 'path';
import fs from 'fs';
import CopyWebpackPlugin from 'copy-webpack-plugin';

const entries = {};

const srcDir = path.join(process.cwd(), 'src');
fs.readdirSync(srcDir).filter((dir) => {
  if (fs.statSync(path.join(srcDir, dir)).isDirectory()) {
    entries[dir] = './' + path.relative(process.cwd(), path.join(srcDir, dir, dir));
  }
});

export default (_, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    mode: isProduction ? 'production' : 'development',
    target: 'web',
    optimization: {
      minimize: isProduction ? true : false
    },
    entry: entries,
    output: {
      filename: '[name]/[name].js',
      path: path.resolve(process.cwd(), 'dist'),
      clean: true
    },
    devServer: {
      static: './',
      hot: true,
      port: 33000,
      server: 'https'
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss'],
      alias: {
        'azure-devops-extension-sdk': path.resolve('node_modules/azure-devops-extension-sdk'),
        'azure-devops-extension-api': path.resolve('node_modules/azure-devops-extension-api'),
        'azure-devops-ui': path.resolve('node_modules/azure-devops-ui')
      },
      modules: [path.resolve('.'), 'node_modules']
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          use: 'ts-loader',
          exclude: ['/node_modules/']
        },
        {
          test: /\.s?css$/,
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: { importLoaders: 1, sourceMap: !isProduction }
            },
            {
              loader: 'sass-loader',
              options: { sourceMap: !isProduction }
            }
          ]
        },
        {
          test: /\.(woff|woff2|ttf|eot)$/,
          type: 'asset/resource',
          dependency: { not: ['url'] },
          generator: {
            filename: '[hash][ext][query]'
          }
        },
        {
          test: /\.(png|svg|jpe?g|gif|html)$/,
          type: 'asset'
        }
      ]
    },
    plugins: [
      new CopyWebpackPlugin({
        patterns: [
          { from: '**/*.html', to: '[name]/[name][ext]', context: 'src' },
          { from: '**/*.{png,jpg,jpeg,gif,svg}', to: './', context: 'src' },
          { from: './OVERVIEW.md', to: './' }
        ]
      })
    ],
    devtool: isProduction ? 'source-map' : 'inline-source-map',
    performance: {
      hints: isProduction ? 'warning' : false
    }
  };
};
