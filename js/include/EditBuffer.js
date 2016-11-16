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

    this.getItem = function(paragraphUuid) {
      var itemModel = editBufferCache.get(paragraphUuid);
      if (!itemModel) {
        itemModel = editBufferCache.add({id: paragraphUuid}, {merge: true});
        commandEmitter.render(paragraphUuid);
      }
      return itemModel;
    }

    this.setItem = function(itemModel) {
      return editBufferCache.add(itemModel, {merge: true});
    }

    this.destroy = function(paragraphUuid) {
      editBufferCache.remove(paragraphUuid);
    }

    this.on = function(evt, callback, context) {
      editBufferCache.on(evt, callback, context);
    }
  };

})(Backbone, Drupal);
