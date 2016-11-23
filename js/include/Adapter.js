/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function (Backbone, Drupal) {

  'use strict';

  Drupal.paragraphs_editor.Adapter = function() {

    this.init = function(editorInstance) {
    }

    this.insertBufferItem = function(bufferItemModel) {
    }

    this.getBufferItem = function(editBuffer, editorWidget) {
    }

    this.getWidget = function(bufferItemModel, editorWidget) {
    }

    this.getWidgetEl = function(editorWidget) {
    }

    this.destroyWidget = function(widgetModel) {
    }

    this.getRootEl = function() {
    }

    this.widgetExists = function(widgetModel) {
    }
  }

  Drupal.paragraphs_editor.Adapter.extend = Backbone.Model.extend;

})(Backbone, Drupal);
