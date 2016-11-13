/**
 * @file
 * A Backbone model for representing paragraphs_ckeditor paragraph previews.
 */

(function (Backbone, Drupal) {

  'use strict';

  /**
   * Backbone  Model for representing paragraphs_ckeditor commands.
   *
   * The id for this model is the uuid of a paragraph entity that the preview
   * corresponds to.
   *
   * @constructor
   *
   * @augments Backbone.Model
   */
  Drupal.paragraphs_ckeditor.ParagraphPreviewModel = Backbone.Model.extend({

    /**
     * @type {object}
     *
     * @prop markup
     */
    defaults: /** @lends Drupal.paragraphs_ckeditor.CommandModel# */{

      /**
       * Whether or not the preview is ready to be inserted.
       *
       * @type {string}
       */
      "insert": false,

      /**
       * Whether or not the preview is for a new (unsaved) entity.
       *
       * @type {string}
       */
      "isNew": false,

      /**
       * The preview markup.
       *
       * @type {string}
       */
      "markup": "...",
    },

  });

}(Backbone, Drupal));
