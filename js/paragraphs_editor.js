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
    $('.paragraphs-editor[data-paragraphs-editor-context="' + response.context + '"')
      .paragraphsEditor('process-command-response', response);
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
      +       '<a href="#" class="paragraphs-editor-command paragraphs-editor-command--edit">edit</a>'
      +     '</li>'
      +     '<li class="paragraphs-editor-widget-toolbar__item">'
      +       '<a href="#" class="paragraphs-editor-command paragraphs-editor-command--remove">remove</a>'
      +     '</li>'
      +   '</ul>'
      + '</div>';
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
