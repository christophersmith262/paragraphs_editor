/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function (_, Backbone, Drupal) {

  'use strict';

  Drupal.paragraphs_editor.Adapter = function() {
  };

  _.extend(Drupal.paragraphs_editor.Adapter.prototype, {
    insertBufferItem: function(bufferItemModel) {},
    getBufferItem: function(editBuffer, editorWidget) {},
    getWidget: function(bufferItemModel, editorWidget) {},
    getWidgetEl: function(editorWidget) {},
    destroyWidget: function(widgetModel) {},
    getRootEl: function() {},
    widgetExists: function(widgetModel) {}
  });

  Drupal.paragraphs_editor.Adapter.extend = Backbone.Model.extend;

})(_, Backbone, Drupal);
