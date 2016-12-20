/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function ($, Drupal) {

  'use strict';

  Drupal.paragraphs_editor.WidgetViewFactory = function(adapter) {
    this._adapter = adapter;
    this._viewModes = [];
  }

  $.extend(Drupal.paragraphs_editor.WidgetViewFactory.prototype, {

    register: function(viewMode, prototype) {
      this._viewModes[viewMode] = prototype;
    },

    create: function(widgetModel, $el, viewMode) {
      if (!viewMode) {
        viewMode = widgetModel.get('viewMode');
      }

      return new this._viewModes[viewMode]({
        "model": widgetModel,
        "adapter": this._adapter,
        "el": $el.get(0),
      });
    },

    createTemporary: function(widgetModel, $el, viewMode) {
      return this.create(widgetModel, $el, viewMode).stopListening();
    }

  });

})(jQuery, Drupal);
