/**
 * @file
 * A Backbone model for representing paragraphs_editor edit buffer items.
 */

(function (Backbone, Drupal) {

  'use strict';

  /**
   * Backbone  Model for representing paragraphs_editor commands.
   *
   * The id for this model is the uuid of a paragraph entity that the item
   * corresponds to.
   *
   * @constructor
   *
   * @augments Backbone.Model
   */
  Drupal.paragraphs_editor.BufferItemModel = Backbone.Model.extend({

    /**
     * @type {object}
     *
     * @prop markup
     */
    defaults: /** @lends Drupal.paragraphs_editor.CommandModel# */{

      /**
       * Whether or not the item is ready to be inserted.
       *
       * @type {string}
       */
      "insert": false,

      /**
       * Whether or not the item is for a new (unsaved) entity.
       *
       * @type {string}
       */
      "isNew": false,

      /**
       * The item markup.
       *
       * @type {string}
       */
      "markup": "...",

      /**
       * The item markup.
       *
       * @type {string}
       */
      "context": "",
    },

  });

}(Backbone, Drupal));
