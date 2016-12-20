/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function (Backbone, Drupal) {

  'use strict';

  /**
   * Handles fetching and caching of rendered paragraphs.
   */
  Drupal.paragraphs_editor.EmbedCode = function(bufferItemModel, sourceContext, targetContext, embedTemplate) {

    this.getSourceContext = function() {
      return sourceContext;
    }

    this.getTargetContext = function() {
      return targetContext;
    }

    this.getBufferItem = function() {
      return bufferItemModel;
    }

    this.getTagName = function() {
      return embedTemplate.tag;
    }

    this.getClose = function () {
      return embedTemplate.close;
    }

    this.getAttributes = function() {
      var attributes = {};
      for (var key in embedTemplate.attributes) {
        var name = embedTemplate.attributes[key];
        if (key == 'uuid') {
          attributes[name] = this.getBufferItem().get('id');
        }
        else if (key == 'context') {
          attributes[name] = this.getTargetContext().getContextString();
        }
      }
      return attributes;
    }
  }

})(Backbone, Drupal);
