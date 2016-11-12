<?php

class FieldValueManager {

  public function wrap(FieldItemListInterface $items, array $settings) {
    $markup = '';
    $entities = array();
    $text_entity = NULL;
    foreach ($items as $item) {
      $paragraph = $item->getTargetEntity();
      if ($paragraph->bundle() == $settings['text_bundle']) {
        $markup .= $paragraph->{$settings['text_field']}->value;
        if (!$text_entity) {
          $text_entity = $paragraph;
        }
      }
      else {
        $entities[] = $paragraph;
      }
    }
    if (!$text_entity) {
      $text_entity = $this->create();
    }
    return new FieldValueWrapper($embedded_paragraphs, $text_entity, $settings);
  }

  public function update(FieldValueWrapperInterface $field_value_wrapper, EditBufferInterface $edit_buffer, $markup, $format) {
    $embed_codes = new EmbedCodeAccountant($edit_buffer);
    $this->embedCodeProcessor->process($values['markup'], $embed_codes);
    $field_value_wrapper->setEntities($embed_codes->getEntities());
    $field_value_wrapper->setMarkup($markup);
    $field_value_wrapper->setFormat($format);
    return $field_value_wrapper;
  }
}
