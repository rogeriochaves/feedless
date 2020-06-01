// From: https://medium.com/better-programming/implement-imagepicker-using-swiftui-7f2a28caaf9c

import SwiftUI

struct ImagePicker : UIViewControllerRepresentable {
    @Binding var isShown : Bool
    @Binding var uiImage : UIImage?

    func makeUIViewController(context: UIViewControllerRepresentableContext<ImagePicker>) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.delegate = context.coordinator
        return picker
    }

    func makeCoordinator() -> ImagePickerCordinator {
        return ImagePickerCordinator(isShown: $isShown, uiImage: $uiImage)
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: UIViewControllerRepresentableContext<ImagePicker>) {

    }
}


class ImagePickerCordinator : NSObject, UINavigationControllerDelegate, UIImagePickerControllerDelegate {
    @Binding var isShown : Bool
    @Binding var uiImage : UIImage?

    init(isShown : Binding<Bool>, uiImage: Binding<UIImage?>) {
      _isShown = isShown
      _uiImage = uiImage
   }

    func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
        uiImage = info[UIImagePickerController.InfoKey.originalImage] as? UIImage
        isShown = false
    }

    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        isShown = false
    }
}

struct PhotoCaptureView: View {
    @Binding var showImagePicker : Bool
    @Binding var uiImage : UIImage?

    var body: some View {
        ImagePicker(isShown: $showImagePicker, uiImage: $uiImage)
    }
}

struct PhotoCaptureView_Previews: PreviewProvider {
    static var previews: some View {
        PhotoCaptureView(showImagePicker: .constant(false), uiImage: .constant(nil))
    }
}
