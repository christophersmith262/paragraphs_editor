/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function ($, Backbone, Drupal) {

  'use strict';

  Drupal.paragraphs_ckeditor.WidgetTable = function(editBuffer, editor) {

    var widgetCollection = new Backbone.Collection([], {
      model: Drupal.paragraphs_ckeditor.WidgetModel,
    });

    var views = {};

    this.count = function(widgetModel) {
      var count = 0;
      if (widgetModel) {
        var i = widgetModel.get('itemId');
        for (var j in views[i]) {
          if (readCell(widgetModel, i, j)) {
            count++;
          }
        }
      }
      return count;
    }

    this.get = function(widgetModel) {
      if (widgetModel) {
        var i = widgetModel.get('itemId');
        var j = widgetModel.get('id');
        return readCell(widgetModel, i, j);
      }
      return null;
    }

    this.add = function(widgetModel, widgetView) {
      var i = widgetModel.get('itemId');
      var j = widgetModel.get('id');
      if (!views[i]) {
        views[i] = {};
      }
      views[i][j] = widgetView;
      this.update(widgetModel);
    }

    this.update = function(widgetModel) {
      widgetCollection.add(widgetModel, {merge: true});
    }

    this.remove = function(widgetModel) {
      var i = widgetModel.get('itemId');
      var j = widgetModel.get('id');

      widgetCollection.remove(widgetModel, {silent: true});

      if (views[i] && views[i][j]) {
        views[i][j].close();
        delete views[i][j];
      }

      cleanRow(i);
    }

    this.render = function(widgetModel) {
      var view = this.get(widgetModel);
      if (view) {
        view.render(widgetModel);
      }
    }

    this.move = function(oldParagraphUuid, newParagraphUuid, widgetId) {
      var i = oldParagraphUuid;
      var j = widgetId;
      var k = newParagraphUuid;

      if (views[i] && views[i][j]) {
        if (!views[k]) {
          views[k] = {};
        }
        views[k][j] = views[i][j];
        delete views[i][j];
      }

      cleanRow(i);
    }

    function readCell(widgetModel, i, j) {
      var view = null;

      if (views[i] && views[i][j]) {
        if (editor.document.$.contains(views[i][j].el)) {
          view = views[i][j];
        }
        else {
          //this.remove(widgetModel);
        }
      }
      return view;
    }

    function cleanRow(i) {
      if (views[i] && !views[i].length) {
        delete views[i];
      }
    }

  };

})(jQuery, Backbone, Drupal);
