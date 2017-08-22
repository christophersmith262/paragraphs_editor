<?php

namespace Drupal\Tests\paragraphs_editor\Traits;

trait TestContentGenerationTrait {

  protected function generateTabs($storage, $tabs = 1) {

    $tab_paragraphs = [];
    for ($i = 0; $i < $tabs; $i++) {
      $tab_paragraph = $this->generateTab($storage, 'Tab ' . $i);
      $tab_paragraph->setNeedsSave(TRUE);
      $tab_paragraphs[] = [
        'entity' => $tab_paragraph,
        'target_id' => $tab_paragraph->id(),
        'target_revision_id' => $tab_paragraph->getRevisionId(),
      ];
    }

    $paragraph = $storage->create([
      'type' => 'tabs',
    ]);
    $paragraph->field_tabs->setValue($tab_paragraphs);
    return $paragraph;
  }

  protected function generateTab($storage, $title = 'Title') {
    $paragraph = $storage->create([
      'type' => 'tab',
    ]);
    $paragraph->field_title->value = $title;
    return $paragraph;
  }

  protected function generateEditorText($storage, $markup = 'test_markup', $format = 'default') {
    $paragraph = $storage->create([
      'type' => 'paragraphs_editor_text',
    ]);
    $paragraph->field_paragraphs_editor_text->setValue([
      'value' => $markup,
      'format' => $format,
    ]);
    return $paragraph;
  }

}
