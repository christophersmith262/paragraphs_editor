/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function ($, Backbone, Drupal) {

  'use strict';

  Drupal.paragraphs_ckeditor.WidgetTable = function(editBuffer, rootParent) {

    var widgetCollection = new Backbone.Collection([], {
      model: Drupal.paragraphs_ckeditor.WidgetModel,
    });

    var views = {};

    this.count(widgetModel) {
      var count = 0;
      if (widgetModel) {
        var i = widgetModel.get('itemId');
        for (var j in views[i]) {
          if (readCell(i, j, widgetModel)) {
            count++;
          }
        }
      }
      return count;
    }

    this.get(widgetModel) {
      if (widgetModel) {
        var i = widgetModel.get('itemId');
        var j = widgetModel.get('id');
        return readCell(i, j, widgetModel);
      }
      return null;
    }

    this.add(widgetModel, widgetView) {
      var i = widgetModel.get('itemId');
      var j = widgetModel.get('id');
      if (!views[i]) {
        views[i] = {};
      }
      views[i][j] = widgetView;
      this.update(widgetModel);
    }

    this.update(widgetModel) {
      if (this.get(widgetModel)) {
        widgetCollection.add(widgetModel, {merge: true});
      }
    }

    this.remove(widgetModel) {
      var i = widgetModel.get('itemId');
      var j = widgetModel.get('id');

      widgetCollection.remove(widgetModel, {silent: true});

      if (views[i] && views[i][j]) {
        views[i][j].close();
        delete views[i][j];
      }

      cleanRow(i);
    }

    this.move(oldParagraphUuid, newParagraphUuid, widgetId) {
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
        if (rootParent.contains(views[i][j].el)) {
          view = views[i][j];
        }
        else {
          this.remove(widgetModel);
        }
      }
      return view;
    }

    function cleanRow(i) {
      if (views[i] && !views[i].length) {
        editBuffer.destroy(i);
        delete views[i];
      }
    }

  };

})(jQuery, Backbone, Drupal);
