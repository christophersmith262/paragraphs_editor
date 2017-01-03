/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function ($, Backbone, Drupal) {

  'use strict';

  Drupal.paragraphs_editor.Context = Backbone.Model.extend({

    initialize: function(attributes, options) {
      this._editBuffer = options.editBuffer;
      this._settings = options.settings;
    },

    getSettings: function() {
      return this._settings;
    },

    getSetting: function(key) {
      return this._settings[key];
    },

    getEditBuffer: function() {
      return this._editBuffer;
    },

    getContextString: function() {
      return this.get('id');
    },

    getEntityType: function() {
      return this.get('id').split(':')[0];
    },

    getFieldId: function() {
      return this.get('id').split(':')[1];
    },

    getBuildId: function() {
      return this.get('id').split(':')[2];
    }

  });

})(jQuery, Backbone, Drupal);
