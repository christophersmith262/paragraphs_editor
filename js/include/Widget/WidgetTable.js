/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function ($, Backbone, Drupal) {

  'use strict';

  Drupal.paragraphs_editor.WidgetTable = function(adapter) {
    this._adapter = adapter;
    this._views = {};

    this._widgetCollection = new Backbone.Collection([], {
      model: Drupal.paragraphs_editor.WidgetModel,
    });
  };

  $.extend(Drupal.paragraphs_editor.WidgetTable.prototype, {

    cleanup: function() {
      for (var i in this._views) {
        for (var j in this._views[i]) {
          this._views[i][j].remove();
          delete this._views[i][j];
        }
        delete this._views[i];
      }
      this._widgetCollection.reset();
    },

    count: function(widgetModel) {
      var count = 0;
      if (widgetModel) {
        var i = widgetModel.get('itemId');
        for (var j in this._views[i]) {
          if (this._readCell(widgetModel, i, j)) {
            count++;
          }
        }
      }
      return count;
    },

     get: function(widgetModel) {
      if (widgetModel) {
        var i = widgetModel.get('itemId');
        var j = widgetModel.get('id');
        return this._readCell(widgetModel, i, j);
      }
      return null;
    },

    add: function(widgetModel, widgetView) {
      var i = widgetModel.get('itemId');
      var j = widgetModel.get('id');
      if (!this._views[i]) {
        this._views[i] = {};
      }
      this._views[i][j] = widgetView;
      this.update(widgetModel);
    },

    update: function(widgetModel) {
      this._widgetCollection.add(widgetModel, {merge: true});
    },

    remove: function(widgetModel) {
      var i = widgetModel.get('itemId');
      var j = widgetModel.get('id');

      this._widgetCollection.remove(widgetModel, {silent: true});

      if (this._views[i] && this._views[i][j]) {
        var view = this._views[i][j];
        delete this._views[i][j];
        view.remove();
      }

      this._cleanRow(i);
    },

    render: function(widgetModel) {
      var view = this.get(widgetModel);
      if (view) {
        view.render(widgetModel);
      }
    },

    move: function(oldParagraphUuid, newParagraphUuid, widgetId) {
      var i = oldParagraphUuid;
      var j = widgetId;
      var k = newParagraphUuid;

      if (this._views[i] && this._views[i][j]) {
        if (!this._views[k]) {
          this._views[k] = {};
        }
        this._views[k][j] = this._views[i][j];
        delete this._views[i][j];
      }

      this._cleanRow(i);
    },

    getModelById(id) {
      return this._widgetCollection.get(id);
    },

    _readCell: function(widgetModel, i, j) {
      var view = null;

      if (this._views[i] && this._views[i][j]) {
        if (this._adapter.getRootEl().contains(this._views[i][j].el)) {
          view = this._views[i][j];
        }
        else {
          //this.remove(widgetModel);
        }
      }
      return view;
    },

    _cleanRow: function(i) {
      if (this._views[i] && !this._views[i].length) {
        delete this._views[i];
      }
    }
  });

  })(jQuery, Backbone, Drupal);
