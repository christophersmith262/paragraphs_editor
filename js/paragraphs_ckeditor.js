/**
 * @file
 * Provides Drupal API integrations for paragraphs_ckeditor.
 */

(function ($, window, Drupal, drupalSettings) {

  /**
   * Attaches the AJAX behavior to setup paragraphs ckeditor instances.
   *
   * @type {Drupal~behavior}
   *
   * @prop {Drupal~behaviorAttach} attach
   *   Attaches ajaxView functionality to relevant elements.
   */
  Drupal.behaviors.paragraphs_ckeditor = {
    attach: function(context) {
      $('.paragraphs-ckeditor', context).paragraphsCKEditor();
    }
  };

  /**
   * Command to process response data from paragraphs ckeditor commands.
   *
   * @param {Drupal.Ajax} [ajax]
   *   {@link Drupal.Ajax} object created by {@link Drupal.ajax}.
   * @param {object} response
   *   The response from the Ajax request.
   * @param {string} response.id
   *   The model id for the command that was used.
   */
  Drupal.AjaxCommands.prototype.paragraphs_ckeditor_data = function(ajax, response, status){
    $('.paragraphs-ckeditor[data-paragraphs-ckeditor-build-id="' + response.widget + '"')
      .paragraphsCKEditor('process-command-response', response);
  }

  /**
   * Theme function for generating paragraphs ckeditor previews.
   *
   * @return {string}
   *   A string representing a DOM fragment.
   */
  Drupal.theme.paragraphsCKEditorPreview = function(markup) {
    return '<div class="paragraphs-ckeditor-preview">'
      + markup
      + '<ul class="paragraphs-ckeditor-preview-toolbar">'
      +   '<li class="paragraphs-ckeditor-preview-toolbar__item">'
      +     '<a href="#" class="paragraphs-ckeditor-command paragraphs-ckeditor-command--edit">edit</a>'
      +   '</li>'
      +   '<li class="paragraphs-ckeditor-preview-toolbar__item">'
      +     '<a href="#" class="paragraphs-ckeditor-command paragraphs-ckeditor-command--remove">remove</a>'
      +   '</li>'
      + '</ul>'
      + '</ul>'
    + '</div>';
  }

  /**
   * {@namespace}
   */
  Drupal.paragraphs_ckeditor = {};

})(jQuery, window, Drupal, drupalSettings);