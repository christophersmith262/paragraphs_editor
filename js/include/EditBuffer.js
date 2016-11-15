/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function (Backbone, Drupal) {

  'use strict';

  /**
   * Handles fetching and caching of rendered paragraphs.
   */
  Drupal.paragraphs_ckeditor.EditBuffer = function(commandEmitter) {

    var editBufferCache = new Backbone.Collection([], {
      model: Drupal.paragraphs_ckeditor.BufferItemModel,
    });

    this.getItem = function(paragraph_uuid) {
      var itemModel = editBufferCache.get(paragraph_uuid);
      if (!itemModel) {
        itemModel = editBufferCache.add({id: paragraph_uuid}, {merge: true});
        commandEmitter.render(paragraph_uuid);
      }
      return itemModel;
    }

    this.setItem = function(itemModel) {
      return editBufferCache.add(itemModel, {merge: true});
    }

    this.destroy = function(paragraph_uuid) {
      editBufferCache.remove(paragraph_uuid);
    }

    this.on = function(evt, callback, context) {
      editBufferCache.on(evt, callback, context);
    }
  };

})(Backbone, Drupal);
