/**
 * @file
 * Provides the logic for executing commands from the queue.
 */

(function ($, Drupal) {

  'use strict';

  Drupal.paragraphs_editor.WidgetFactory = function(adapter, contextResolver, embedCodeFactory, prototype) {
    this._adapter = adapter;
    this._contextResolver = contextResolver;
    this._embedCodeFactory = embedCodeFactory;
    this._prototype = prototype;
  }

  $.extend(Drupal.paragraphs_editor.WidgetFactory.prototype, {

    create: function(widget, id, $el) {
      var sourceContext = this._contextResolver.resolveSourceContext($el);
      var targetContext = this._contextResolver.resolveTargetContext($el);
      var uuidAttribute = this._embedCodeFactory.getAttributes().uuid;
      var bufferItemModel = sourceContext.getEditBuffer().getItem($el.attr(uuidAttribute));

      var options = {
        "embedCodeFactory": this._embedCodeFactory,
        "widget": widget,
      };

      var widgetModel = new this._prototype({
        "id": id,
        "itemContext": sourceContext.getContextString(),
        "editorContext": targetContext.getContextString(),
        "itemId": bufferItemModel.get('id'),
      }, options);

      return widgetModel;
    }
  });

})(jQuery, Drupal);
