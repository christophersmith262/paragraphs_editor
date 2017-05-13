var gulp = require('gulp'),
  browserify = require('gulp-browserify'),
  concat = require('gulp-concat'),
  replace = require('gulp-replace'),
  uglify = require('gulp-uglify'),
  util = require('gulp-util'),
  pump = require('pump');

uglify().on('error', function(err) {
  console.log('asfasdfasfdas');
  this.emit('end');
})

var jsSrc = 'js/src/index.js';
var jsDst = 'js/dist';
var fileName = 'paragraphseditor.js';

gulp.task('scripts', function(cb) {
  gulp.src(jsSrc)
    .pipe(browserify({
      debug: !!util.env.production,
    }))
    .on('prebundle', function(bundle) {
      bundle.exclude('jquery');
      bundle.exclude('underscore');
      bundle.exclude('backbone');
      bundle.exclude('drupal');
      bundle.exclude('drupal-settings');
    })
    .pipe(replace(/require\('jquery'\)/g, 'window.jQuery    '))
    .pipe(replace(/require\('underscore'\)/g, 'window._             '))
    .pipe(replace(/require\('backbone'\)/g, 'window.Backbone    '))
    .pipe(replace(/require\('drupal'\)/g, 'window.Drupal    '))
    .pipe(replace(/require\('drupal-settings'\)/g, 'window.drupalSettings     '))
    .pipe(concat(fileName))
    .pipe(gulp.dest(jsDst));

  if (util.env.production) {
    pump([
      gulp.src(jsDst + '/*.js'),
      uglify(),
      gulp.dest(jsDst),
    ], cb);
  }

});

gulp.task('watch', function() {
  gulp.watch(jsSrc, ['scripts']);
});
