/**
 * @file
 * A Backbone model for representing paragraphs_editor paragraph widgets.
 */

(function (Backbone, Drupal) {

  'use strict';

  /**
   * Backbone  Model for representing paragraphs_editor paragraph widgets.
   *
   * @constructor
   *
   * @augments Backbone.Model
   */
  Drupal.paragraphs_editor.WidgetModel = Backbone.Model.extend({

    /**
     * @type {object}
     *
     * @prop markup
     */
    defaults: /** @lends Drupal.paragraphs_editor.CommandModel# */{

      /**
       * The data to be sent with the command.
       *
       * @type {string}
       */
      "markup": "...",

      "itemId": 0,

      "context": "",
    },

    onItemUpdate: function(bufferItemModel) {
      this.set({
        markup: bufferItemModel.get('markup'),
        context: bufferItemModel.get('context')
      });
    },

  });

}(Backbone, Drupal));
