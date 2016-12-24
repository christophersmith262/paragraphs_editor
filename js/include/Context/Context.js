/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function ($, Backbone, Drupal) {

  'use strict';

  Drupal.paragraphs_editor.Context = function(contextString, editBuffer, settings) {
    this._contextString = contextString;
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

    getContextString: function () {
      return this._contextString;
    }
  });

})(jQuery, Backbone, Drupal);
