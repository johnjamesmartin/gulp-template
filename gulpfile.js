(() => {
  'use strict';

  /* Gulp 4 config (NODE_ENV="production" for production):
   **************************************************************/
  const devBuild =
    (process.env.NODE_ENV || 'development').trim().toLowerCase() ===
    'development';

  /* Directory locations:
   **************************************************************/
  const dir = {
    src: 'src/',
    buildMin: 'build-min/',
    buildPretty: 'build-pretty'
  };

  /* Dependencies:
   **************************************************************/
  const gulp = require('gulp'),
    htmlPartial = require('gulp-html-partial'),
    htmlmin = require('gulp-htmlmin'),
    formatHtml = require('gulp-format-html'),
    webpack = require('webpack-stream'),
    minify = require('gulp-minify'),
    del = require('del'),
    babel = require('gulp-babel'),
    noop = require('gulp-noop'),
    newer = require('gulp-newer'),
    size = require('gulp-size'),
    imagemin = require('gulp-imagemin'),
    sass = require('gulp-sass'),
    postcss = require('gulp-postcss'),
    sourcemaps = devBuild ? require('gulp-sourcemaps') : null,
    browsersync = devBuild ? require('browser-sync').create() : null;

  // Log build mode
  console.log('Gulp', devBuild ? 'development' : 'production', 'build');

  /* Clean task:
   **************************************************************/
  const clean = () => del([dir.buildMin, dir.buildPretty]);
  exports.clean = clean;
  exports.wipe = clean;

  /* Images task:
   **************************************************************/
  const imgConfig = {
    src: dir.src + 'images/**/*',
    buildMin: dir.buildMin + '/images/',
    buildPretty: dir.buildPretty + '/images/',
    minOpts: {
      optimizationLevel: 5
    }
  };
  const images = () => {
    return gulp
      .src(imgConfig.src)
      .pipe(newer(imgConfig.buildMin))
      .pipe(imagemin(imgConfig.minOpts))
      .pipe(size({ showFiles: true }))
      .pipe(gulp.dest(imgConfig.buildMin))
      .pipe(gulp.dest(imgConfig.buildPretty));
  };
  exports.images = images;

  /* CSS task:
   **************************************************************/
  const cssConfig = {
    src: dir.src + 'scss/style.scss',
    watch: dir.src + 'scss/**/*',
    buildMin: dir.buildMin + '/css/',
    buildPretty: dir.buildPretty + '/css/',
    sassOpts: {
      sourceMap: devBuild,
      outputStyle: 'nested',
      imagePath: '/images/',
      precision: 3,
      errLogToConsole: true
    },
    postCSS: [
      require('postcss-assets')({
        loadPaths: ['images/'],
        basePath: dir.buildMin
      }),
      require('autoprefixer')({
        browsers: ['> 1%']
      })
    ]
  };
  // Remove unused selectors and minify production CSS
  if (!devBuild) {
    cssConfig.postCSS.push(
      require('usedcss')({ html: ['index.html'] }),
      require('cssnano')
    );
  }
  const css = () => {
    return gulp
      .src(cssConfig.src)
      .pipe(sourcemaps ? sourcemaps.init() : noop())
      .pipe(sass(cssConfig.sassOpts).on('error', sass.logError))
      .pipe(postcss(cssConfig.postCSS))
      .pipe(sourcemaps ? sourcemaps.write() : noop())
      .pipe(size({ showFiles: true }))
      .pipe(gulp.dest(cssConfig.buildPretty))
      .pipe(gulp.dest(cssConfig.buildMin))
      .pipe(browsersync ? browsersync.reload({ stream: true }) : noop());
  };
  exports.css = gulp.series(images, css);

  /* JS task:
   **************************************************************/
  const jsConfig = {
    src: dir.src + 'js/*.js',
    watch: dir.src + 'js/**/*',
    buildPretty: dir.buildPretty + '/js/',
    buildMin: dir.buildMin + '/js/'
  };
  // Minify production JS
  // if (!devBuild)
  const js = () => {
    return gulp
      .src(jsConfig.src)
      .pipe(
        webpack({
          output: {
            filename: 'bundle.js'
          }
        })
      )
      .pipe(
        babel({
          // Plugin that sets some metadata
          plugins: [
            {
              post(file) {
                file.metadata.test = 'metadata';
              }
            }
          ]
        })
      )
      .pipe(gulp.dest(jsConfig.buildPretty))
      .pipe(gulp.dest(jsConfig.buildMin));
  };
  exports.js = gulp.series(js);

  /* Compress task:
   **************************************************************/
  const compressjs = () => {
    return gulp
      .src(jsConfig.buildMin)
      .pipe(minify({ noSource: true }))
      .pipe(gulp.dest(jsConfig.buildMin));
  };
  exports.compressjs = gulp.series(compressjs);

  /* HTML task:
   **************************************************************/
  const html = () => {
    return gulp
      .src(['src/html/*.html'])
      .pipe(
        htmlPartial({
          basePath: 'src/html/'
        })
      )
      .pipe(formatHtml())
      .pipe(gulp.dest('build-pretty'))
      .pipe(htmlmin({ collapseWhitespace: true }))
      .pipe(gulp.dest('build-min'));
  };
  exports.html = gulp.series(html);

  /* Server task (now private):
   **************************************************************/
  const syncConfig = {
    server: {
      baseDir: 'build-min/',
      index: 'index.html'
    },
    port: 8000,
    open: false
  };
  // browser-sync
  const server = done => {
    if (browsersync) browsersync.init(syncConfig);
    done();
  };

  /* Watch task:
   **************************************************************/
  const watch = done => {
    gulp.watch(imgConfig.src, images);
    gulp.watch(cssConfig.watch, css);
    gulp.watch(jsConfig.watch, exports.js);
    done();
  };

  /* Default task:
   **************************************************************/
  exports.default = gulp.series(
    exports.clean,
    exports.css,
    exports.js,
    exports.compressjs,
    exports.html,
    watch,
    server
  );
})();
