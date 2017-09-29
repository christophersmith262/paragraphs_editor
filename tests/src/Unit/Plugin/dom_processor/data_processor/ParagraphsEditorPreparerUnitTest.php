<?php

namespace Drupal\Tests\paragraphs_editor\Unit\Plugin\dom_processor\data_processor;

use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\Field\EntityReferenceFieldItemListInterface;
use Drupal\Core\Field\FieldConfigInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Tests\UnitTestCase;
use Drupal\Tests\dom_processor\Traits\DomProcessorTestTrait;
use Drupal\Tests\paragraphs_editor\Traits\MockContextTrait;
use Drupal\Tests\paragraphs_editor\Traits\MockFieldValueManagerTrait;
use Drupal\paragraphs\ParagraphInterface;
use Drupal\paragraphs_editor\EditorCommand\CommandContextFactoryInterface;
use Drupal\paragraphs_editor\EditorFieldValue\FieldValueWrapperInterface;
use Drupal\paragraphs_editor\Plugin\dom_processor\data_processor\ParagraphsEditorPreparer;
use Drupal\paragraphs_editor\WidgetBinder\WidgetBinderData;
use Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerInterface;
use Prophecy\Argument;

/**
 * @coversDefaultClass \Drupal\paragraphs_editor\Plugin\dom_processor\data_processor\ParagraphsEditorPreparer
 * @group paragraphs_editor
 */
class ParagraphsEditorPreparerUnitTest extends UnitTestCase {
  use MockContextTrait;
  use MockFieldValueManagerTrait;
  use DomProcessorTestTrait;

  public function testProcessPassThrough() {
    $field_value_manager = $this->createFieldValueManagerProphecy()->reveal();
    $context_factory = $this->createContextFactory();
    $data_compiler = $this->prophesize(WidgetBinderDataCompilerInterface::CLASS)->reveal();
    $data = $this->createDomProcessorData('<div></div>', 'div', [
      'preparer' => [
        'ready' => TRUE,
      ],
    ]);
    $result = $this->createDomProcessorResult();
    $processor = new ParagraphsEditorPreparer($field_value_manager, $context_factory, $data_compiler);
    $result = $processor->process($data, $result);
    $this->assertTrue(true);
  }

  /**
   * @dataProvider widgetProvider
   */
  public function testProcess($prerender_count) {
    $manager_prophecy = $this->createFieldValueManagerProphecy();

    $owner_entity = $this->createOwnerEntityProphecy()->reveal();
    $owner_items = $this->createOwnerFieldItemsProphecy()->reveal();

    $nested_prophecy = $this->createChildParagraphProphecy('uuid2');
    $nested_field_definition = $this->createChildFieldDefinitionProphecy()->reveal();
    $prophecy = $this->createChildFieldItemsProphecy();
    $prophecy->getFieldDefinition()->willReturn($nested_field_definition);
    $nested_items = $prophecy->reveal();
    $nested_prophecy->getFields()->willReturn([$nested_items]);
    $nested_entity = $nested_prophecy->reveal();

    $child_prophecy = $this->createChildParagraphProphecy('uuid1');
    $child_field_definition = $this->createChildFieldDefinitionProphecy()->reveal();

    $prophecy = $this->createChildFieldItemsProphecy();
    $prophecy->getFieldDefinition()->willReturn($child_field_definition);
    $child_items = $prophecy->reveal();
    $child_prophecy->getFields()->willReturn([$child_items]);
    $child_entity = $child_prophecy->reveal();

    $prophecy = $this->prophesize(FieldValueWrapperInterface::CLASS);
    $prophecy->getReferencedEntities()->willReturn([$nested_entity]);
    $field_value_wrapper = $prophecy->reveal();
    $manager_prophecy->wrapItems($child_items)->willReturn($field_value_wrapper);
    $manager_prophecy->isParagraphsField($child_field_definition)->willReturn(TRUE);
    $manager_prophecy->isParagraphsEditorField($child_field_definition)->willReturn(TRUE);
    $manager_prophecy->isParagraphsField($nested_field_definition)->willReturn(TRUE);
    $manager_prophecy->isParagraphsEditorField($nested_field_definition)->willReturn(FALSE);
    $manager_prophecy->getReferencedEntities($nested_items)->willReturn([]);

    $prophecy = $this->prophesize(FieldValueWrapperInterface::CLASS);
    $prophecy->getFormat()->willReturn('test_format');
    $owner_field_value_wrapper = $prophecy->reveal();

    $field_value_manager = $manager_prophecy->reveal();
    $prophecy = $this->prophesize(CommandContextFactoryInterface::CLASS);
    $context = $this->createContext([
      'context_id' => 'owner_context',
    ]);
    $prophecy->create('field_type', 'owner_id', [])->willReturn($context);
    $prophecy->get('owner_context')->willReturn($context);
    $context_factory = $prophecy->reveal();
    $prophecy = $this->prophesize(WidgetBinderDataCompilerInterface::CLASS);
    $prophecy->compile(Argument::cetera())->will(function ($args) {
      $data = new WidgetBinderData();
      $data->addModel('context', 'nested_context', [
        'ownerId' => 'uuid1',
        'fieldId' => 'paragraph.field_test',
      ]);
      return $data;
    });
    $data_compiler = $prophecy->reveal();

    $processor = new ParagraphsEditorPreparer($field_value_manager, $context_factory, $data_compiler);
    $data = $this->createDomProcessorData('<widget></widget>', 'body', [
      'owner' => [
        'entity' => $owner_entity,
      ],
      'settings' => [],
      'field' => [
        'items' => $owner_items,
        'wrapper' => $owner_field_value_wrapper,
      ],
    ]);
    $result = $this->createDomProcessorResult();
    $result = $processor->process($data, $result);
    $this->assertTrue(true);


    $data = $this->createDomProcessorData('<widget></widget>', 'widget', [
      'preparer' => [
        'ready' => TRUE,
      ],
      'settings' => [
        'prerender_count' => $prerender_count,
      ],
      'paragraph' => [
        'entity' => $child_entity,
      ],
      'field' => [
        'context_id' => 'owner_context',
      ],
    ]);
    $processor->process($data, $result);

    $data = $this->createDomProcessorData('<widget></widget>', 'body', [
      'preparer' => [
        'ready' => TRUE,
      ],
      'field' => [
        'context_id' => 'owner_context',
      ],
    ]);
    $processor->process($data, $result);
  }

  public function widgetProvider() {
    return [
      [-1],
      [0],
      [1],
    ];
  }

  protected function createOwnerEntityProphecy() {
    $prophecy = $this->prophesize(EntityInterface::CLASS);
    $prophecy->id()->willReturn('owner_id');
    return $prophecy;
  }

  protected function createOwnerFieldItemsProphecy() {
    $prophecy = $this->prophesize(FieldConfigInterface::CLASS);
    $prophecy->id()->willReturn('field_type');
    $field_definition = $prophecy->reveal();

    $prophecy = $this->prophesize(FieldItemListInterface::CLASS);
    $prophecy->getFieldDefinition()->willReturn($field_definition);

    return $prophecy;
  }

  protected function createChildFieldDefinitionProphecy() {
    $prophecy = $this->prophesize(FieldConfigInterface::CLASS);
    $prophecy->getName()->willReturn('field_test');
    $prophecy->id()->willReturn('paragraph.field_test');
    return $prophecy;
  }

  protected function createChildFieldItemsProphecy() {
    $prophecy = $this->prophesize(EntityReferenceFieldItemListInterface::CLASS);
    return $prophecy;
  }

  protected function createChildParagraphProphecy($uuid) {
    $prophecy = $this->prophesize(ParagraphInterface::CLASS);
    $prophecy->uuid()->willReturn($uuid);
    return $prophecy;
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
