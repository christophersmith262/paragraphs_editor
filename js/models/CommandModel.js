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
  Drupal.paragraphs_ckeditor.CommandModel = Backbone.Model.extend({

    /**
     * @type {object}
     *
     * @prop data
     * @prop success
     * @prop response
     */
    defaults: /** @lends Drupal.paragraphs_ckeditor.CommandModel# */{

      /**
       * The data to be sent with the command.
       *
       * @type {object}
       */
      "data": {},

      /**
       * The callback to be fired once the command has finished processing.
       *
       * @type {function}
       */
      "success": function() {},

      /**
       * The data that was sent back in a ParagraphsCKEditorDataCommand.
       *
       * @type {@object}
       */
      "response": '',
    },

  });

}(Backbone, Drupal));
