//
//  FocusableTextField.swift
//  feedless
//
//  Created by Rogerio Chaves on 22/05/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI

struct FocusableTextField: UIViewRepresentable {

    class Coordinator: NSObject, UITextFieldDelegate {

        @Binding var text: String
        @Binding var nextResponder: Bool?
        @Binding var isResponder: Bool?
        @Binding var placeholder: String?

        init(text: Binding<String>,nextResponder : Binding<Bool?> , isResponder : Binding<Bool?>, placeholder : Binding<String?>) {
            _text = text
            _isResponder = isResponder
            _nextResponder = nextResponder
            _placeholder = placeholder
        }

        func textFieldDidChangeSelection(_ textField: UITextField) {
            text = textField.text ?? ""
        }

        func textFieldDidBeginEditing(_ textField: UITextField) {
            DispatchQueue.main.async {
                self.isResponder = true
            }
        }

        func textFieldDidEndEditing(_ textField: UITextField) {
            DispatchQueue.main.async {
                self.isResponder = false
                if self.nextResponder != nil {
                    self.nextResponder = true
                }
            }
        }
    }

    @Binding var text: String
    @Binding var nextResponder: Bool?
    @Binding var isResponder: Bool?
    @Binding var placeholder: String?

    var isSecured : Bool = false
    var keyboard : UIKeyboardType

    func makeUIView(context: UIViewRepresentableContext<FocusableTextField>) -> UITextField {
        let textField = UITextField(frame: .zero)
        textField.isSecureTextEntry = isSecured
        textField.autocapitalizationType = .none
        textField.autocorrectionType = .no
        textField.keyboardType = keyboard
        textField.delegate = context.coordinator
        if let p = placeholder {
            textField.placeholder = p
        }
        return textField
    }

    func makeCoordinator() -> FocusableTextField.Coordinator {
        return Coordinator(text: $text, nextResponder: $nextResponder, isResponder: $isResponder, placeholder: $placeholder)
    }

    func updateUIView(_ uiView: UITextField, context: UIViewRepresentableContext<FocusableTextField>) {
        uiView.text = text
        if isResponder ?? false {
            uiView.becomeFirstResponder()
        }
    }

}
