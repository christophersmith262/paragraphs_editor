/**
 * @file
 * A Backbone model for representing paragraphs_ckeditor commands.
 */

(function (Backbone, Drupal) {

  'use strict';

  /**
   * Backbone  Model for representing paragraphs_ckeditor commands.
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
       * The data to be sent with the command.
       *
       * @type {string}
       */
      "markup": "...",
    },

  });

}(Backbone, Drupal));
