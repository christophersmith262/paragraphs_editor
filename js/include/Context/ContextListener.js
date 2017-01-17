/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function (Backbone, Drupal, $) {

  'use strict';

  Drupal.paragraphs_editor.ContextListener = function() {
  }

  $.extend(Drupal.paragraphs_editor.ContextListener.prototype, Backbone.Events, {

    addContext: function(context) {
      this.listenTo(context.editBuffer, 'add update', this._triggerEvents);
      return this;
    },

    _triggerEvents: function(bufferItemModel) {
      if (bufferItemModel.get('insert')) {
        this.trigger('insertItem', bufferItemModel);
        bufferItemModel.set({insert: false});
      }
      else {
        this.trigger('updateItem', bufferItemModel);
      }
    }
  });

})(Backbone, Drupal, jQuery);
