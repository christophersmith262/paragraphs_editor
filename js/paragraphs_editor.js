/**
 * @file
 * Provides Drupal API integrations for paragraphs_editor.
 */

(function ($, window, Drupal, drupalSettings) {

  /**
   * Attaches the AJAX behavior to setup paragraphs editor instances.
   *
   * @type {Drupal~behavior}
   *
   * @prop {Drupal~behaviorAttach} attach
   *   Attaches ajaxView functionality to relevant elements.
   */
  Drupal.behaviors.paragraphs_editor = {
    attach: function(context) {
      $('textarea.paragraphs-editor', context).paragraphsEditor();
    }
  };

  /**
   * Command to process response data from paragraphs editor commands.
   *
   * @param {Drupal.Ajax} [ajax]
   *   {@link Drupal.Ajax} object created by {@link Drupal.ajax}.
   * @param {object} response
   *   The response from the Ajax request.
   * @param {string} response.id
   *   The model id for the command that was used.
   */
  Drupal.AjaxCommands.prototype.paragraphs_editor_data = function(ajax, response, status){
    if (response.widget) {
      $('.paragraphs-editor[data-paragraphs-editor-context="' + response.context + '"')
        .paragraphsEditor('update', response.widget);
    }
    if (response.editBufferItem) {
      Drupal.paragraphs_editor.loader.getContextFactory()
        .create(response.context)
        .getEditBuffer()
        .setItem(response.editBufferItem);
    }
  }

  /**
   * Theme function for generating paragraphs editor widgets.
   *
   * @return {string}
   *   A string representing a DOM fragment.
   */
  Drupal.theme.paragraphsEditorWidget = function(markup) {
    return '<div class="paragraphs-editor-widget">'
      +   markup
      +   '<ul class="paragraphs-editor-widget-toolbar">'
      +     '<li class="paragraphs-editor-widget-toolbar__item">'
      +       '<a href="#" class="paragraphs-editor-command paragraphs-editor-command--edit">Edit</a>'
      +     '</li>'
      +     '<li class="paragraphs-editor-widget-toolbar__item">'
      +       '<a href="#" class="paragraphs-editor-command paragraphs-editor-command--remove">Remove</a>'
      +     '</li>'
      +   '</ul>'
      + '</div>';
  }

  /**
   * Theme function for generating paragraphs editor widgets.
   *
   * @return {string}
   *   A string representing a DOM fragment.
   */
  Drupal.theme.paragraphsEditorWidgetMemento = function(items) {
    var result = '';
    for (var i in items) {
      result += '<paragraphs-editor-nested-editor '
        + 'data-paragraphs-editor-context="' + items[i].context + '">'
        + items[i].value + '</paragraphs-editor-nested-editor>';
    }
    return result;
  }

  /**
   * {@namespace}
   */
  Drupal.paragraphs_editor = {};

  /**
   * {@namespace}
   */
  Drupal.paragraphs_editor.Adapters = {};

})(jQuery, window, Drupal, drupalSettings);
