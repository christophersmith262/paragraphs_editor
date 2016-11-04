<?php

namespace Drupal\paragraphs_ckeditor\Ckeditor;

class Reader {
  protected $text = '';
  protected $paragraphs = array();

  public function __construct($contents, $element, $form_state) {
    $contents = preg_replace('/<paragraphs-ckeditor-paragraph/', '<div class="paragraphs-ckeditor-item"', $contents);
    $contents = preg_replace('/paragraphs-ckeditor-paragraph>/', 'div>', $contents);
    $this->doc = new \DOMDocument();
    $this->doc->loadHTML($contents);
    $this->xpath = new \DOMXPath($this->doc);
    $this->form_state = $form_state;
    $this->field_name = $element['#field_name'];
  }

  public function read() {
    foreach ($this->xpath->query('//body/*') as $element) {
      if ($this->isEmbeddedParagraph($element)) {
        $this->pushTextParagraph();
        $this->pushEmbeddedParagraph($element);
      }
      else {
        $this->addTextElement($element);
      }
    }
    $this->pushTextParagraph();
    return $this;
  }

  public function readInto(\Drupal\paragraphs_extra\Widget\State $state) {
    $weight = 0;
    $state->clear();
    foreach ($this->read()->getParagraphs() as $paragraph) {
      $state->insert($paragraph, $weight++);
    }
  }

  protected function isEmbeddedParagraph($element) {
    $is_embedded = FALSE;
    if ($element->nodeName == 'div' && $element->hasAttribute('class')) {
      $classes = explode(' ', $element->getAttribute('class'));
      if (in_array('paragraphs-ckeditor-item', $classes) && $element->hasAttribute('entity-form-id')) {
        $is_embedded = TRUE;
      }
    }
    return $is_embedded;
  }

  protected function pushEmbeddedParagraph($element) {
    $entity_form_id = $element->getAttribute('entity-form-id');
    if (isset($this->form_state['paragraphs_ckeditor']['entities'][$entity_form_id])) {
      $entity = $this->form_state['paragraphs_ckeditor']['entities'][$entity_form_id];
      $this->paragraphs[] = $entity;
    }
  }

  protected function pushTextParagraph() {
    if (!empty($this->text)) {
      $value = array(
        'value' => $this->text,
        'format' => 'filtered_html',
      );
      $entity = entity_create('paragraphs_item', array(
        'bundle' => 'text',
        'field_name' => $this->field_name,
        'is_new' => TRUE,
      ));
      $wrapper = entity_metadata_wrapper('paragraphs_item', $entity);
      $wrapper->field_text->set($value);
      $this->paragraphs[] = $entity;
    }
    $this->text = '';
  }

  protected function addTextElement($element) {
    $this->text .= $this->doc->saveHTML($element);
  }

  public function getParagraphs() {
    return $this->paragraphs;
  }
}
