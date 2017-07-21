<?php

namespace Drupal\Tests\paragraphs_editor\Unit\EditorFieldValue;

use Drupal\Core\Config\Entity\ThirdPartySettingsInterface;
use Drupal\Core\Field\EntityReferenceFieldItemListInterface;
use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldStorageDefinitionInterface;
use Drupal\paragraphs\ParagraphInterface;
use Drupal\paragraphs_editor\EditBuffer\EditBufferInterface;
use Drupal\paragraphs_editor\EditBuffer\EditBufferItemInterface;
use Drupal\paragraphs_editor\EditorFieldValue\EmbedCodeProcessor;
use Drupal\paragraphs_editor\EditorFieldValue\EmbedCodeVisitorInterface;
use Drupal\paragraphs_editor\EditorFieldValue\FieldValueManagerInterface;
use Drupal\paragraphs_editor\EditorCommand\CommandContextFactoryInterface;
use Drupal\paragraphs_editor\EditorCommand\CommandContextInterface;
use Drupal\Tests\UnitTestCase;

class EmbedCodeProcessorTestStream implements EmbedCodeVisitorInterface {

  public $items = [];

  public function visit(\DOMNode $node, array $item) {
    $normalized_item = [];
    $normalized_item['type'] = $item['type'];
    $normalized_item['uuid'] = !empty($item['paragraph']['entity']) ? strval($item['paragraph']['entity']->uuid()) : false;

    if (!empty($item['field']['instance'])) {
      $normalized_item['field_name'] = $item['field']['instance']->getFieldDefinition()->getName();
    }
    else {
      $normalized_item['field_name'] = false;
    }
    $normalized_item['is_mutable'] = !empty($item['field']['is_mutable']) ? true : false;

    if ($item['type'] == 'field') {
      $normalized_item['context_id'] = !empty($item['field']['context_id']) ? $item['field']['context_id'] : false;
    }
    else if ($item['type'] == 'paragraph') {
      $normalized_item['context_id'] = !empty($item['paragraph']['context_id']) ? $item['paragraph']['context_id'] : false;
    }
    else {
      $normalized_item['context_id'] = false;
    }

    $this->items[] = $normalized_item;
  }
}

/**
 * @coversDefaultClass Drupal\paragraphs_editor\EditorFieldValue\EmbedCodeProcessor
 *
 * @group paragraphs_editor
 */
class EmbedCodeProcessorTest extends UnitTestCase {

  const elements = [
    'widget' =>  [
      'tag' =>  'paragraph',
      'attributes' =>  [
        'data-uuid' =>  '<uuid>',
        'data-context-hint' =>  '<context>',
        'data-viewmode' =>  '<viewmode>',
      ],
      'selector' =>  'paragraph[data-context-hint]',
    ],
    'field' =>  [
      'tag' =>  'paragraph-field',
      'attributes' =>  [
        'data-field-name' =>  '<name>',
        'data-context' =>  '<context>',
        'data-mutable' =>  '<editable>',
      ],
      'selector' => 'paragraph-field[data-mutable="true"],.editable-paragraph-field',
    ],
    'widget-display' =>  [
      'tag' =>  'div',
      'attributes' =>  [
        'class' =>  'widget-binder-widget__display',
      ]
    ],
    'toolbar' =>  [
      'tag' =>  'ul',
      'attributes' =>  [
        'class' =>  'widget-binder-toolbox',
      ]
    ],
    'toolbar-item' =>  [
      'tag' =>  'li',
      'attributes' =>  [
        'class' =>  'widget-binder-toolbox__item',
      ]
    ],
    'widget-command' =>  [
      'tag' =>  'a',
      'attributes' =>  [
        'class' =>  'widget-binder-command',
        'data-command' =>  '<command>',
        'href' =>  '#',
      ]
    ]
  ];

  protected function createContext(array $entities) {
    $edit_buffer_prophecy = $this->prophesize(EditBufferInterface::CLASS);
    foreach ($entities as $entity) {
      $buffer_item_prophecy = $this->prophesize(EditBufferItemInterface::CLASS);
      $buffer_item_prophecy->getEntity()->willReturn($entity);
      $buffer_item = $buffer_item_prophecy->reveal();
      $edit_buffer_prophecy->getItem($entity->uuid())->willReturn($buffer_item);
    }
    $edit_buffer = $edit_buffer_prophecy->reveal();

    $prophecy = $this->prophesize(CommandContextInterface::CLASS);
    $prophecy->getEditBuffer()->willReturn($edit_buffer);

    return $prophecy->reveal();
  }

  protected function createFieldStorageDefinition() {
    $prophecy = $this->prophesize(FieldStorageDefinitionInterface::CLASS);
    $prophecy->getCardinality()->willReturn(-1);
    return $prophecy->reveal();
  }

  protected function createFieldDefinition($field_name, $type) {
    $prophecy = $this->prophesize(FieldDefinitionInterface::CLASS);
    $prophecy->willImplement(ThirdPartySettingsInterface::CLASS);
    $prophecy->getName()->willReturn($field_name);
    $prophecy->getType()->willReturn($type);
    $prophecy->getFieldStorageDefinition()->willReturn($this->createFieldStorageDefinition());
    $prophecy->getThirdPartySettings('paragraphs_editor')->willReturn([
      'enabled' => TRUE,
    ]);
    $prophecy->getThirdPartySetting('paragraphs_editor', 'text_bundle')->willReturn('somebundle');
    $prophecy->getThirdPartySetting('paragraphs_editor', 'text_field')->willReturn('somefield');
    return $prophecy->reveal();
  }

  protected function createField($entity, $field_name, array $children, array $settings, $field_value_manager_prophecy) {
    $prophecy = $this->prophesize(EntityReferenceFieldItemListInterface::CLASS);
    $prophecy->getEntity()->willReturn($entity);
    $prophecy->getFieldDefinition()->willReturn($this->createFieldDefinition($field_name, 'entity_reference_revisions'));
    $prophecy->getValue()->willReturn($children);
    $prophecy->referencedEntities()->willReturn($children);
    $field = $prophecy->reveal();

    $prophecy = $this->prophesize(FieldValueWrapperInterface::CLASS);
    $field_value_wrapper =  $prophecy->reveal();
    $field_value_wrapper->field = $field;
    $field_value_manager_prophecy->wrap($field, $settings)->willReturn($field_value_wrapper);

    return $field;
  }

  protected function createEntity($properties, $uuid, array $settings, $field_value_manager_prophecy) {
    $prophecy = $this->prophesize(ParagraphInterface::CLASS);
    $prophecy->uuid()->willReturn($uuid);
    $entity = $prophecy->reveal();
    foreach ($properties as $field_name => $child_entities) {
      $children = [];
      foreach ($child_entities as $child_uuid => $child_properties) {
        $children[] = $this->createEntity($child_properties, $child_uuid, $settings, $field_value_manager_prophecy);
      }
      $field = $this->createField($entity, $field_name, $children, $settings, $field_value_manager_prophecy);
      $entity->{$field_name} = $field;
    }
    return $entity;
  }

  protected function createTestCase(array $test) {
    if (!isset($test['contexts'])) {
      $test['contexts'] = [];
    }
    if (!isset($test['settings'])) {
      $test['settings'] = [];
    }
    if (!isset($test['elements'])) {
      $test['elements'] = self::elements;
    }
    if (!isset($test['expected'])) {
      throw new \Exception('Missing expectation for one or more tests.');
    }
    if (!isset($test['markup'])) {
      throw new \Exception('Missing markup for one or more tests.');
    }

    $context_factory_prophecy = $this->prophesize(CommandContextFactoryInterface::CLASS);
    $field_value_manager_prophecy = $this->prophesize(FieldValueManagerInterface::CLASS);

    $root_entity = $this->createEntity([], 'root-field-owner', $test['settings'], $field_value_manager_prophecy);
    $root_field = $this->createField($root_entity, 'field_root', [], $test['settings'], $field_value_manager_prophecy);

    foreach ($test['contexts'] as $context_id => $entity_definitions) {
      $entities = [];

      if (empty($test['root_context'])) {
        $test['root_context'] = $context_id;
      }

      foreach ($entity_definitions as $uuid => $properties) {
        $entities[] = $this->createEntity($properties, $uuid, $test['settings'], $field_value_manager_prophecy);
      }
      $context = $this->createContext($entities, $test['settings']);
      $context_factory_prophecy->get($context_id)->willReturn($context);
    }
    $context_factory = $context_factory_prophecy->reveal();
    $field_value_manager = $field_value_manager_prophecy->reveal();

    $test['root_field'] = $root_field;
    $test['processor'] = new EmbedCodeProcessor($context_factory, $field_value_manager, $test['elements']);
    $test['reader'] = new EmbedCodeProcessorTestStream();

    return $test;
  }

  public function processDataProvider() {
    $test_cases = [
      [
        'contexts' => [
          'context1' => [
            '1' => [
              'field_field1' => [
                '2' => [
                  'field_field2' => [],
                ],
              ],
            ],
          ],
          'context2' => [
            '3' => [
              'field_field3' => [],
            ],
          ],
        ],
        'markup' => 
          '<paragraph data-uuid="1" data-context-hint="context1">
            <paragraph-field data-mutable="false" data-field-name="field_field1">
              <paragraph data-uuid="2">
                <paragraph-field data-mutable="true" data-context="context2" data-field-name="field_field2">
                  <p>test1</p>
                  <paragraph data-uuid="3" data-context-hint="context2">
                  </paragraph>
                  <p>test2</p>
                </paragraph-field>
              </paragraph>
            </paragraph-field>
          </paragraph>',
        'expected' => [
          [
            'type' => 'paragraph',
            'uuid' => '3',
            'field_name' => 'field_field2',
            'is_mutable' => true,
            'context_id' => 'context2',
          ],
          [
            'type' => 'field',
            'uuid' => false,
            'field_name' => 'field_field2',
            'is_mutable' => true,
            'context_id' => 'context2',
          ],
          [
            'type' => 'paragraph',
            'uuid' => '2',
            'field_name' => 'field_field1',
            'is_mutable' => false,
            'context_id' => false,
          ],
          [
            'type' => 'field',
            'uuid' => false,
            'field_name' => 'field_field1',
            'is_mutable' => false,
            'context_id' => false,
          ],
          [
            'type' => 'paragraph',
            'uuid' => '1',
            'field_name' => 'field_root',
            'is_mutable' => true,
            'context_id' => 'context1',
          ],
          [
            'type' => 'field',
            'uuid' => false,
            'field_name' => 'field_root',
            'is_mutable' => true,
            'context_id' => 'context1',
          ],
          [
            'type' => 'eof',
            'uuid' => false,
            'field_name' => false,
            'is_mutable' => false,
            'context_id' => false,
          ],
        ]
      ],
    ];

    $data = [];
    foreach ($test_cases as $test_case) {
      $data[] = [$this->createTestCase($test_case)];
    }
    return $data;
  }

  /**
   * @dataProvider processDataProvider
   */
  public function testProcess(array $test) {
    $markup = $test['processor']->process($test['markup'], $test['root_field'], $test['root_context'], $test['settings'], [$test['reader']]);
    $this->assertEquals($test['reader']->items, $test['expected']);
    $this->assertEquals(preg_replace('/\s/', '', $markup), preg_replace('/\s/', '', $test['markup']));
  }
}
