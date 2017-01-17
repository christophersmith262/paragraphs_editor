/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function (Backbone, Drupal, $) {

  'use strict';

  Drupal.paragraphs_editor.ContextResolver = function(contextFactory, sourceContextAttribute, targetContextAttribute, editorContext) {
    this._contextFactory = contextFactory;
    this._sourceContextAttribute = sourceContextAttribute;
    this._targetContextAttribute = targetContextAttribute;
    this._editorContext = editorContext;
  }

  $.extend(Drupal.paragraphs_editor.ContextResolver.prototype, {

    resolveTargetContext: function ($el) {
      var contextString = $el.attr(this._targetContextAttribute);
      if (!contextString) {
        contextString = $el.closest('[' + this._targetContextAttribute + ']').attr(this._targetContextAttribute);
      }

      return this.create(contextString);
    },

    resolveSourceContext: function($el) {
      return this.create($el.attr(this._sourceContextAttribute));
    },

    getEditorContext: function() {
      return this._editorContext;
    },

    create: function(contextString) {
      if (contextString) {
        var settings = this._editorContext ? this._editorContext.getSettings() : undefined;
        return this._contextFactory.create(contextString, settings);
      }
      else {
        return this._editorContext;
      }
    },

    touch: function(contextString) {
      return this._contextFactory.touch(contextString);
    },

    updateContextId: function(oldContextId, newContextId) {
      return this._contextFactory.updateContextId(oldContextId, newContextId);
    }

  });

})(Backbone, Drupal, jQuery);
