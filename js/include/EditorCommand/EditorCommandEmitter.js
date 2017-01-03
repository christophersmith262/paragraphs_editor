/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function ($, Drupal) {

  'use strict';

  Drupal.paragraphs_editor.EditorCommandEmitter = function(editorContext) {
    this._editorContext = editorContext;
    this._params = [];

    var settings = editorContext.getSettings();
    for (var key in settings) {
      this._params.push('settings[' + key + ']=' + settings[key]);
    }
    this._params = '?' + this._params.join('&');
  }

  $.extend(Drupal.paragraphs_editor.EditorCommandEmitter.prototype, {

    /**
     * Executes an "insert" command.
     */
    insert: function(targetContextString, bundleName) {
      var options = {
        command: "insert",
        targetContext: targetContextString,
      };

      if (bundleName) {
        options.bundleName = bundleName;
      }

      this._execute(options);
    },

    /**
     * Executes an "edit" command.
     */
    edit: function(targetContextString, uuid) {
      this._execute({
        command: "edit",
        targetContext: targetContextString,
        paragraph: uuid
      });
    },

    /**
     * Executes an "render" command.
     */
    render: function(targetContextString, uuid) {
      this._execute({
        command: "render",
        targetContext: targetContextString,
        paragraph: uuid
      });
    },

    /**
     * Executes an "duplicate" command.
     */
    duplicate: function(targetContextString, sourceContextString, uuid, widgetId) {
      this._execute({
        command: "duplicate",
        targetContext: targetContextString,
        sourceContext: sourceContextString,
        paragraph: uuid,
        widget: widgetId
      });
    },

    /**
     * Internal callback for triggering the command to be sent.
     *
     * @param {Drupal.paragraphs_editor.CommandModel} model
     *   The command to be executed.
     */
    _execute: function(command) {
      if (!command.command) {
        return;
      }
      var path = '/ajax/paragraphs-editor/' + command.command;

      if ('targetContext' in command) {
        path += '/' + command.targetContext;
      }

      if ('sourceContext' in command) {
        path += '/' + command.sourceContext;
      }

      if ('paragraph' in command) {
        path += '/' + command.paragraph;
      }

      if ('widget' in command) {
        path += '/' + command.widget;
      }

      if ('bundleName' in command) {
        path += '/' + command.bundleName;
      }

      path += this._params;

      var ajax = Drupal.ajax({
        url: path,
        progress: {
          message: "",
        },
      });

      ajax.options.data['editorContext'] = this._editorContext.getContextString();

      var complete = ajax.options.complete;

      ajax.options.complete = function (xmlhttprequest, status) {
        complete.call(ajax.options, xmlhttprequest, status);
        Drupal.ajax.instances.splice(ajax.instanceIndex, 1);
      }

      ajax.execute();
    }
  });

})(jQuery, Drupal);
