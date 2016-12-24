/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function (Backbone, Drupal, $) {

  'use strict';

  Drupal.paragraphs_editor.EditBuffer = Backbone.Collection.extend({

    initialize: function(models, options) {
      this.targetContextString = options.targetContextString;
    },

    getItem: function(commandEmitter, paragraphUuid) {
      var itemModel = this.get(paragraphUuid);
      if (!itemModel) {
        itemModel = this.add({id: paragraphUuid}, {merge: true});
        commandEmitter.render(this.targetContextString, paragraphUuid);
      }
      return itemModel;
    },

    setItem: function(itemModel) {
      return this.add(itemModel, {merge: true});
    },

    removeItem: function(paragraphUuid) {
      this.remove(paragraphUuid);
    },
  });

})(Backbone, Drupal, jQuery);
