<?php
/**
 * @file
 * Handle integration with the paragarph item.
 */

/**
 * Attaches metadata to paragraph items in paragraphs field widgets.
 *
 * This provides a mechanism for the javascript layer to find fields that are
 * using CKEDITOR.
 *
 * @param array &$element
 *   The paragraphs widget element to decorate.
 */
function paragraphs_ckeditor_decorator_decorate(&$element) {
  $element['#attached']['js'][] = drupal_get_path('module', 'paragraphs_ckeditor') . '/js/CkeditorDomSplitter.js';
  foreach ($element as $delta => &$item) {
    if (is_numeric($delta)) {
      foreach (element_children($item) as $field_candidate) {
        $instance = field_info_instance('paragraphs_item', $field_candidate, $element[$delta]['#bundle']);
        if ($instance) {
          $field = field_info_field($field_candidate);
          if ($field) {
            if ($field['type'] == 'text_long' && $instance['settings']['text_processing']) {
              $element[$delta][$field_candidate]['#attributes']['data-paragraphs-ckeditor-field'] = $field_candidate;
              $element[$delta][$field_candidate]['#attributes']['class'][] = 'paragraphs-ckeditor-field';
            }
          }
        }
      }
    }
  }
}
