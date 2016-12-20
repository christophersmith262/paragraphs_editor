/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function (Backbone, Drupal, $) {

  'use strict';

  /**
   * Handles fetching and caching of rendered paragraphs.
   */
  Drupal.paragraphs_editor.EditBuffer = function(commandEmitter) {
    this._commandEmitter = commandEmitter;
    this._editBufferCache = new Backbone.Collection([], {
      model: Drupal.paragraphs_editor.BufferItemModel,
    });
  }

  $.extend(Drupal.paragraphs_editor.EditBuffer.prototype, {

    getItem: function(paragraphUuid) {
      var itemModel = this._editBufferCache.get(paragraphUuid);
      if (!itemModel) {
        itemModel = this._editBufferCache.add({id: paragraphUuid}, {merge: true});
        this._commandEmitter.render(paragraphUuid);
      }
      return itemModel;
    },

    setItem: function(itemModel) {
      return this._editBufferCache.add(itemModel, {merge: true});
    },

    destroy: function(paragraphUuid) {
      this._editBufferCache.remove(paragraphUuid);
    },

    addListener: function(listener, events, callback) {
      listener.listenTo(this._editBufferCache, events, callback);
    }

  });

})(Backbone, Drupal, jQuery);
