/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function ($, Drupal) {

  'use strict';

  /**
   * Sends paragraph commands.
   */
  Drupal.paragraphs_ckeditor.EditorCommandEmitter = function($element, contextString, settings) {

    var params = [];
    for (var key in settings) {
      params.push('settings[' + key + ']=' + settings[key]);
    }
    params = '?' + params.join('&');

    var ajax = Drupal.ajax({
      base: $element.attr('id'),
      element: $element.get(0),
      url: '/ajax',
      progress: {
        message: "",
      }
    });
    
    var defaults = {
      context: contextString,
    };

    /**
     * Executes an "insert" command.
     */
    this.insert = function() {
      execute(_.extend({command: "insert"}, defaults));
    };

    /**
     * Executes an "edit" command.
     */
    this.edit = function(uuid) {
      execute(_.extend({command: "edit", paragraph: uuid}, defaults));
    };

    /**
     * Executes an "render" command.
     */
    this.render = function(uuid) {
      execute(_.extend({command: "render", paragraph: uuid}, defaults));
    };

    /**
     * Executes an "duplicate" command.
     */
    this.duplicate = function(uuid, source_context, widget_id) {
      execute(_.extend({
        command: "render",
        paragraph: uuid,
        context2: source_context,
        widget: widget_id
      }, defaults));
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

      if (command.context) {
        path += '/' + command.context;
      }

      if (command.context2) {
        path += '/' + command.context2;
      }

      if (command.paragraph) {
        path += '/' + command.paragraph;
      }

      if (command.widget) {
        path += '/' + command.widget;
      }

      path += params;

      ajax.options.url = path;
      ajax.execute();
    };
  };

})(jQuery, Drupal);
