/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function ($, Backbone, Drupal) {

  'use strict';

  /**
   * Sends paragraph action commands.
   */
  Drupal.paragraphs_ckeditor.ParagraphCommandController = function($element, widget_build_id, field_id) {

    var ajax = Drupal.ajax({
      base: $element.attr('id'),
      element: $element.get(0),
      progress: {
        message: "",
      }
    });
    
    var defaults = {
      widget: widget_build_id,
      field: field_id,
    };

    this.insert = function() {
      execute(_.extend({command: "insert"}, defaults));
    };

    this.edit = function(uuid) {
      execute(_.extend({command: "edit", paragraph: uuid}, defaults));
    };

    this.preview = function(uuid) {
      execute(_.extend({command: "preview", paragraph: uuid}, defaults));
    };

    /**
     * Internal callback for triggering the command to be sent.
     *
     * @param {Drupal.paragraphs_ckeditor.CommandModel} model
     *   The command to be executed.
     */
    function execute(command) {
      if (!command.command) {
        return;
      }
      var path = '/ajax/paragraphs-ckeditor/' + command.command;

      if (command.widget) {
        path += '/' + command.widget;
      }

      if (command.field) {
        path += '/' + command.field;
      }

      if (command.paragraph) {
        path += '/' + command.paragraph;
      }

      ajax.options.url = path;
      ajax.execute();
    };
  };

})(jQuery, Backbone, Drupal);
