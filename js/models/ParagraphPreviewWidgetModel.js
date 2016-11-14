/**
 * @file
 * A Backbone model for representing paragraphs_ckeditor paragraph widgets.
 */

(function (Backbone, Drupal) {

  'use strict';

  /**
   * Backbone  Model for representing paragraphs_ckeditor paragraph widgets.
   *
   * @constructor
   *
   * @augments Backbone.Model
   */
  Drupal.paragraphs_ckeditor.ParagraphPreviewWidgetModel = Backbone.Model.extend({

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
      "markup": "",

      "previewId": 0,

      "context": "",
    },

    onPreviewUpdate: function(preview_model) {
      this.set({
        markup: preview_model.get('markup'),
        context: preview_model.get('context')
      });
    },

  });

}(Backbone, Drupal));
