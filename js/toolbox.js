/**
 * @file
 * Provides Drupal API integrations for paragraphs_ckeditor.
 */

(function ($, window, Drupal, drupalSettings) {

  Drupal.behaviors.paragraphs_ckeditor_toolbox = {
    attach: function(context) {
      $('.cke_contents', context).once()
        .addClass('paragraphs-ckeditor-toolbox-processed')
        .after($(Drupal.theme.paragraphsCKEditorToolbox()));
      $('.paragraphs-ckeditor-toolbox-cards__card:odd').addClass('odd');
    }
  };


  Drupal.theme.paragraphsCKEditorToolbox = function() {
    return '<div class="paragraphs-ckeditor-toolbox">'
      +      '<h4 class="paragraphs-ckeditor-toolbox-header">Pattern Library</h4>'
      +      '<input type="text" value="search..." class="paragraphs-ckeditor-toolbox-search">'
      +      '<ul class="paragraphs-ckeditor-toolbox-cards">'
      +        '<li class="paragraphs-ckeditor-toolbox-cards__card" draggable="true">Image</li>'
      +        '<li class="paragraphs-ckeditor-toolbox-cards__card" draggable="true">Slideshow</li>'
      +        '<li class="paragraphs-ckeditor-toolbox-cards__card" draggable="true">Accordion</li>'
      +        '<li class="paragraphs-ckeditor-toolbox-cards__card" draggable="true">Hero Image</li>'
      +      '</ul>'
      +    '</div>';
  }

})(jQuery, window, Drupal, drupalSettings);
