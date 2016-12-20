/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function ($, Drupal) {

  'use strict';

  Drupal.paragraphs_editor.WidgetManager = function(widgetTracker, viewFactory, editBufferMediator) {
    this._widgetTracker = widgetTracker;
    this._viewFactory = viewFactory;
    this._editBufferMediator = editBufferMediator;
  }

  $.extend(Drupal.paragraphs_editor.WidgetManager.prototype, {

    insert: function($targetEl, bundleName) {
      this._editBufferMediator.requestBufferItem(bundleName, $targetEl);
    },

    create: function(widget, id, $targetEl) {
      return this._widgetTracker.track(widget, id, $targetEl);
    },

    edit: function(id) {
      this._applyToModel(id, function(widgetModel) {
        widgetModel.edit();
      });
    },

    save: function(id, $targetEl) {
      this._applyToModel(id, function(widgetModel) {
        this._viewFactory.createTemporary(widgetModel, $targetEl, 'editor').save();
        this._viewFactory.createTemporary(widgetModel, $targetEl, 'export').render().save();
      });
    },

    destroy: function(id) {
      this._applyToModel(id, function(widgetModel) {
        widgetModel.destroy();
      });
    },

    cleanup: function() {
      this._widgetTracker.cleanup();
      this._editBufferMediator.cleanup();
    },

    _applyToModel(id, callback) {
      var widgetModel = this._widgetTracker.getTrackedTable().getModelById(id);
      if (widgetModel) {
        callback.apply(this, [widgetModel]);
      }
    }
  });

})(jQuery, Drupal);
