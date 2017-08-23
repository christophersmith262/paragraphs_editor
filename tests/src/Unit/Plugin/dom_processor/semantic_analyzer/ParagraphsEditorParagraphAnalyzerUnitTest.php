<?php

namespace Drupal\Tests\paragraphs_editor\Unit\Plugin\dom_processor\semantic_analyzer;

use Drupal\Core\Field\FieldConfigInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Entity\EntityStorageInterface;
use Drupal\dom_processor\DomProcessor\DomProcessorError;
use Drupal\paragraphs_editor\Plugin\dom_processor\semantic_analyzer\ParagraphsEditorParagraphAnalyzer;
use Drupal\Tests\dom_processor\Traits\DomProcessorTestTrait;
use Drupal\Tests\paragraphs_editor\Traits\MockContextTrait;
use Drupal\Tests\paragraphs_editor\Traits\MockFieldValueManagerTrait;
use Drupal\Tests\UnitTestCase;

/**
 * @coversDefaultClass \Drupal\paragraphs_editor\Plugin\dom_processor\semantic_analyzer\ParagraphsEditorParagraphAnalyzer
 * @group paragraphs_editor
 */
class ParagraphsEditorParagraphAnalyzerUnitTest extends UnitTestCase {
  use MockContextTrait;
  use MockFieldValueManagerTrait;
  use DomProcessorTestTrait;

  /**
   * @dataProvider widgetProvider
   */
  public function testAnalyzeWidget($markup, $in_field, $in_storage, $context_id, $expected_uuid) {
    if (!isset($expected_uuid)) {
      $this->setExpectedException(DomProcessorError::CLASS);
  }

    $prophecy = $this->createFieldValueManagerProphecy();
    if ($in_field) {
      $items = $this->prophesize(FieldItemListInterface::CLASS)->reveal();
      $prophecy = $this->createFieldValueManagerProphecy();
      $data = $this->createDomProcessorData($markup, 'widget', [
        'field' => [
          'items' => $items,
        ],
      ]);
      $r1 = rand();
      $r2 = rand();
      $prophecy->getReferencedEntities($items)->willReturn([
        $r1 => $this->createMockParagraph(['uuid' => $r1]),
        $expected_uuid => $this->createMockParagraph(['uuid' => $expected_uuid]),
        $r2 => $this->createMockParagraph(['uuid' => $r2]),
      ]);
    }
    else {
      $data = $this->createDomProcessorData($markup, 'widget');
    }
    $field_value_manager = $prophecy->reveal();

    $prophecy = $this->prophesize(EntityStorageInterface::CLASS);
    if ($in_storage) {
      $prophecy->loadByProperties(['uuid' => $expected_uuid])
        ->willReturn([$this->createMockParagraph(['uuid' => $expected_uuid])])
        ->shouldBeCalledTimes(1);
    }
    $storage = $prophecy->reveal();

    if (isset($context_id)) {
      $context_factory = $this->createContextFactory([
        'contexts' => [
          $context_id => [
            'context_id' => $context_id,
            'edit_buffer' => [
              'default_items' => [$this->createMockParagraph(['uuid' => $expected_uuid])],
            ],
          ],
        ],
      ]);
    }
    else {
      $context_factory = $this->createContextFactory();
    }

    $analyzer = new ParagraphsEditorParagraphAnalyzer($field_value_manager, $storage, $context_factory);

    $data = $analyzer->analyze($data);
    if (isset($expected_uuid)) {
      $this->assertNotEmpty($data->get('paragraph.entity'));
      $this->assertEquals($expected_uuid, $data->get('paragraph.entity')->uuid());
      $this->assertEquals($context_id, $data->get('paragraph.context_id'));
    }
  }

  /**
   * 1 - p-exists
   * 2 - f-exists
   * 3 - f-is-p
   * 4 - f-is-e
   *
   * @dataProvider fieldProvider
   */
  public function testAnalyzeField($markup, $field_name, $level, $expect_exception, $expect_context_id, $expect_is_mutable, $expect_wrapper) {
    if ($expect_exception) {
      $this->setExpectedException(DomProcessorError::CLASS);
    }

    $wrapper = 0;
    $field_value_manager_prophecy = $this->createFieldValueManagerProphecy();
    if ($level) {
      $paragraph = $this->createMockParagraph();
      $data = $this->createDomProcessorData($markup, 'field', [
        'paragraph' => [
          'entity' => $paragraph,
        ],
      ]);

      if ($level > 1) {
        $field_config = $this->prophesize(FieldConfigInterface::CLASS)->reveal();
        $prophecy = $this->prophesize(FieldItemListInterface::CLASS);
        $prophecy->getFieldDefinition()->willReturn($field_config);
        $paragraph->$field_name = $prophecy->reveal();

        if ($level > 3) {
          $wrapper = TRUE;
        }
        $field_value_manager_prophecy->isParagraphsField($field_config)->willReturn($level > 2);
        $field_value_manager_prophecy->isParagraphsEditorField($field_config)->willReturn($level > 3);
        $field_value_manager_prophecy->wrapItems($paragraph->$field_name)->willReturn($wrapper);
      }
    }
    else {
      $data = $this->createDomProcessorData($markup, 'field');
    }
    $field_value_manager = $field_value_manager_prophecy->reveal();
    $storage = $this->prophesize(EntityStorageInterface::CLASS)->reveal();
    $context_factory = $this->createContextFactory();
    $analyzer = new ParagraphsEditorParagraphAnalyzer($field_value_manager, $storage, $context_factory);
    $data = $analyzer->analyze($data);

    if (!$expect_exception) {
      $this->assertEquals($paragraph->$field_name, $data->get('field.items'));
      $this->assertEquals($expect_context_id, $data->get('field.context_id'));
      $this->assertEquals($expect_is_mutable, $data->get('field.is_mutable'));
      $this->assertEquals($expect_wrapper, $data->get('field.wrapper'));
    }
  }

  public function widgetProvider() {
    return [
      ['<widget></widget>', 0, 0, NULL, NULL],
      ['<widget data-uuid="uuid0" data-context="context0">', 0, 0, 'context0', 'uuid0'],
      ['<widget data-uuid="uuid1" data-context="context1">', 1, 0, NULL, 'uuid1'],
      ['<widget data-uuid="uuid2" data-context="context2">', 0, 1, NULL, 'uuid2'],
      ['<widget data-uuid="uuid3" data-context="context3">', 0, 0, NULL, NULL],
      ['<widget data-uuid="uuid4">', 0, 1, NULL, 'uuid4'],
      ['<widget data-uuid="uuid5">', 1, 0, NULL, 'uuid5'],
      ['<widget data-uuid="uuid6">', 0, 0, NULL, NULL],
    ];
  }

  public function fieldProvider() {
    return [
      ['<field data-name="field1">', 'field1', 0, 1, NULL, 0, 0],
      ['<field data-name="field1">', 'field1', 1, 1, NULL, 0, 0],
      ['<field data-name="field1">', 'field1', 2, 1, NULL, 0, 0],
      ['<field data-name="field1">', 'field1', 3, 0, NULL, 0, 0],
      ['<field data-name="field1">', 'field1', 4, 0, NULL, 0, 0],
      ['<field data-name="field1" data-context="context1">', 'field1', 0, 1, NULL, 0, 0],
      ['<field data-name="field1" data-context="context1">', 'field1', 1, 1, NULL, 0, 0],
      ['<field data-name="field1" data-context="context1">', 'field1', 2, 1, NULL, 0, 0],
      ['<field data-name="field1" data-context="context1">', 'field1', 3, 0, NULL, 0, 0],
      ['<field data-name="field1" data-context="context1">', 'field1', 4, 0, NULL, 0, 0],
      ['<field data-name="field1" data-editable="true">', 'field1', 0, 1, NULL, 0, 0],
      ['<field data-name="field1" data-editable="true">', 'field1', 1, 1, NULL, 0, 0],
      ['<field data-name="field1" data-editable="true">', 'field1', 2, 1, NULL, 0, 0],
      ['<field data-name="field1" data-editable="true">', 'field1', 3, 1, NULL, 0, 0],
      ['<field data-name="field1" data-editable="true">', 'field1', 4, 0, NULL, 1, 1],
      ['<field data-name="field1" data-context="context1" data-editable="true">', 'field1', 0, 1, NULL, 0, 0],
      ['<field data-name="field1" data-context="context1" data-editable="true">', 'field1', 1, 1, NULL, 0, 0],
      ['<field data-name="field1" data-context="context1" data-editable="true">', 'field1', 2, 1, NULL, 0, 0],
      ['<field data-name="field1" data-context="context1" data-editable="true">', 'field1', 3, 1, NULL, 0, 0],
      ['<field data-name="field1" data-context="context1" data-editable="true">', 'field1', 4, 0, 'context1', 1, 1],
      ['<field>', 'field1', 4, 1, NULL, 0, 0],
    ];
  }

  protected function createFieldValueManagerProphecy() {
    return $this->createFieldValueManager([
      'elements' => [
        'widget' => [
          'tag' => 'widget',
          'attributes' => [
            'data-context' => '<context>',
            'data-uuid' => '<uuid>',
          ],
          'selector' => 'widget',
        ],
        'field' => [
          'tag' => 'field',
          'attributes' => [
            'data-name' => '<name>',
            'data-editable' => '<editable>',
            'data-context' => '<context>',
          ],
          'selector' => 'field',
        ],
      ],
    ], TRUE);
  }

}
