/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function (Backbone, Drupal, $) {

  'use strict';

  Drupal.paragraphs_editor.EditBufferItemCollection = Backbone.Collection.extend({

    model: Drupal.paragraphs_editor.EditBufferItemModel,

    initialize: function(models, options) {
      this._contextId = options.contextId;
    },

    getItem: function(commandEmitter, paragraphUuid) {
      var itemModel = this.get(paragraphUuid);
      if (!itemModel) {
        itemModel = this.add({id: paragraphUuid}, {merge: true});
        commandEmitter.render(this._contextId, paragraphUuid);
      }
      return itemModel;
    },

    setItem: function(itemModel) {
      return this.add(itemModel, {merge: true});
    },

    removeItem: function(paragraphUuid) {
      this.remove(paragraphUuid);
    },

    getContextId: function() {
      return this._contextId;
    }
  });

})(Backbone, Drupal, jQuery);
