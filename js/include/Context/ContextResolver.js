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

      return this._getContext(contextString);
    },

    resolveSourceContext: function($el) {
      return this._getContext($el.attr(this._sourceContextAttribute));
    },

    _getContext: function(contextString) {
      return contextString ? this._contextFactory.create(contextString) : this._editorContext;
    }

  });

})(Backbone, Drupal, jQuery);
