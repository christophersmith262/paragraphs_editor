<?php

namespace Drupal\paragraphs_ckeditor\Plugin\Field\FieldWidget;

use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Field\WidgetBase;
use Drupal\paragraphs\Plugin\Field\FieldWidget\InlineParagraphsWidget;

/**
 * Plugin implementation of the 'entity_reference paragraphs' widget.
 *
 * We hide add / remove buttons when translating to avoid accidental loss of
 * data because these actions effect all languages.
 *
 * @FieldWidget(
 *   id = "entity_reference_paragraphs_ckeditor",
 *   label = @Translation("Paragraphs (CKEditor)"),
 *   description = @Translation("CKEditor paragraphs form widget."),
 *   field_types = {
 *     "entity_reference_revisions"
 *   }
 * )
 */
class CkeditorParagraphsWidget extends InlineParagraphsWidget {

  /**
   * {@inheritdoc}
   */
  public function formElement(FieldItemListInterface $items, $delta, array $element, array &$form, FormStateInterface $form_state) {
  }

  public function formMultipleElements(FieldItemListInterface $items, array &$form, FormStateInterface $form_state, $get_delta = NULL) {

    $elements['editor'] = array(
      '#type' => 'text_format',
      '#format' => 'paragraphs_ckeditor',
    );

    return $elements;
  }

  /**
   * {@inheritdoc}
   */
  public function form(FieldItemListInterface $items, array &$form, FormStateInterface $form_state, $get_delta = NULL) {

    return WidgetBase::form($items, $form, $form_state, $get_delta);
  }
}
