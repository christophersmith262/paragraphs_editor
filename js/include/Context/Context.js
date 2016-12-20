/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function ($, Backbone, Drupal) {

  'use strict';

  Drupal.paragraphs_editor.Context = function(contextString, commandEmitter, editBuffer, settings) {
    this._contextString = contextString;
    this._commandEmitter = commandEmitter;
    this._editBuffer = editBuffer;
    this._settings = settings;
  }

  $.extend(Drupal.paragraphs_editor.Context.prototype, {

    getSettings: function() {
      return this._settings;
    },

    getSetting: function(key) {
      return this._settings[key];
    },

    getEditBuffer: function() {
      return this._editBuffer;
    },

    getCommandEmitter: function() {
      return this._commandEmitter;
    },

    getContextString: function () {
      return this._contextString;
    }
  });

})(jQuery, Backbone, Drupal);
