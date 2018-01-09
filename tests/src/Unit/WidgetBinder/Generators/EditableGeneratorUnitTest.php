<?php

namespace Drupal\Tests\paragraphs_editor\Unit\WidgetBinder\Generators;

use Drupal\Core\Field\FieldConfigInterface;
use Drupal\Tests\UnitTestCase;
use Drupal\Tests\paragraphs_editor\Traits\MockContextTrait;
use Drupal\Tests\paragraphs_editor\Traits\MockFieldValueManagerTrait;
use Drupal\dom_processor\DomProcessor\DomProcessorInterface;
use Drupal\dom_processor\DomProcessor\DomProcessorResultInterface;
use Drupal\entity_reference_revisions\EntityReferenceRevisionsFieldItemList;
use Drupal\paragraphs_editor\WidgetBinder\Generators\ContextGenerator;
use Drupal\paragraphs_editor\WidgetBinder\Generators\EditableGenerator;
use Drupal\paragraphs_editor\WidgetBinder\WidgetBinderData;
use Drupal\paragraphs_editor\WidgetBinder\WidgetBinderDataCompilerState;

/**
 * @coversDefaultClass \Drupal\paragraphs_editor\WidgetBinder\Generators\EditableGenerator
 * @group paragraphs_editor
 */
class EditableGeneratorUnitTest extends UnitTestCase {
  use MockContextTrait;
  use MockFieldValueManagerTrait;

  /**
   * @dataProvider markupProvider
   */
  public function testProcessField($input, $expected) {
    // Set up field_value_manager.
    $field_value_manager = $this->createFieldValueManager([
      'wrapper_options' => [
        'uuid1' => [
          'field_content' => [
            'markup' => $input,
          ]
        ],
      ],
    ]);

    // Set up dom_processor.
    $result_prophecy = $this->prophesize(DomProcessorResultInterface::CLASS);
    $result_prophecy->get('markup')
      ->willReturn($expected)
      ->shouldBeCalledTimes(1);
    $prophecy = $this->prophesize(DomProcessorInterface::CLASS);
    $prophecy->process($input, 'paragraphs_editor', 'decorator', [ 'context_id' => 'context1'])
      ->willReturn($result_prophecy->reveal())
      ->shouldBeCalledTimes(1);
    $dom_processor = $prophecy->reveal();

    // Create the generator to test.
    $elements['field'] = [
      'attributes' => [
        'data-context' => '<context>',
      ],
      'flag' => 'paragraphs-editor-field',
    ];
    $generator = new EditableGenerator($field_value_manager, $dom_processor, $elements);

    $data = new WidgetBinderData();
    $data->addModel('context', 'context1', [
      'ownerId' => 'uuid1',
      'fieldId' => 'field_content',
    ]);

    // Create a state with a context generator.
    $context = $this->createContext(['context_id' => 'context1']);
    $item = $context->getEditBuffer()->createItem($this->createMockParagraph());
    $items = $this->createFieldItems(1, 'uuid1', 'field_content');
    $prophecy = $this->prophesize(ContextGenerator::CLASS);
    $prophecy->getContext('context1')
      ->willReturn($context)
      ->shouldBeCalledTimes(1);
    $state = new WidgetBinderDataCompilerState([
      'context' => $prophecy->reveal(),
    ], $data, $context, $item);

    $generator->processField($data, $state, $items, TRUE);
    $editable = $generator->getEditable($state, $items);

    $this->assertEquals($expected, (string)$editable->getMarkup());
    $this->assertEquals([
      'class' => ['_flag_field'],
      'data-context' => 'context1',
    ], $editable->getAttributes()->toArray());
  }

  public function markupProvider() {
    return [
      [ 'input_markup', 'output_markup' ],
      [ '', '' ]
    ];
  }

  protected function createFieldItems($id, $uuid, $field_id) {
    $prophecy = $this->prophesize(EntityReferenceRevisionsFieldItemList::CLASS);
    $prophecy->getEntity()->willReturn($this->createMockParagraph([ 'id' => $id, 'uuid' => $uuid ]));
    $prophecy_factory = $this;
    $prophecy->getFieldDefinition()->will(function () use ($prophecy_factory, $field_id) {
      $prophecy = $prophecy_factory->prophesize(FieldConfigInterface::CLASS);
      $prophecy->id()->willReturn($field_id);
      $prophecy->getName()->willReturn($field_id);
      return $prophecy->reveal();
    });
    return $prophecy->reveal();
  }
}
