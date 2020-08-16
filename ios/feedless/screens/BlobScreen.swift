//
//  EditProfileScreen.swift
//  feedless
//
//  Created by Rogerio Chaves on 01/06/20.
//  Copyright © 2020 Rogerio Chaves. All rights reserved.
//

import SwiftUI
import Foundation
import CoreServices

struct AsyncBlob: View {
    @ObservedObject var imageLoader : ImageLoader
    let url : String
    let blob : String
    @State private var isSharePresented: Bool = false

    init(blob: String, imageLoader: ImageLoader) {
        self.url = Utils.blobUrl(blob: blob)
        self.imageLoader = imageLoader
        imageLoader.load(url: url)
        self.blob = blob
    }

    func getFileName(_ mimeType: String) -> String {
        if let uti = UTTypeCreatePreferredIdentifierForTag(kUTTagClassMIMEType, mimeType as CFString, nil),
            let ext = UTTypeCopyPreferredTagWithClass(uti.takeRetainedValue(), kUTTagClassFilenameExtension) {

            return blob + "." + (ext.takeRetainedValue() as String)
        }
        return blob
    }

    var body: some View {
        if let image = imageLoader.images[url] {
            return AnyView(Image(uiImage: image)
                .renderingMode(.original)
                .resizable())
        } else if let _ = imageLoader.imagesNotFound[url] {
            return AnyView(Text("File not found"))
        } else if
            let (mimeType, data) = imageLoader.notImages[url],
            let fileUrl = createFileToURL(withData: data, withName: getFileName(mimeType)) {

            return AnyView(
                VStack {
                    Text("This is not an image")
                    PrimaryButton(text: "Open in...") {
                        self.isSharePresented = true
                    }.padding(.top, 20)
                }.sheet(isPresented: $isSharePresented, content: {
                    ActivityViewController(activityItems: [fileUrl])
                })
            )
        } else {
            return AnyView(Text("Loading..."))
        }
    }
}

struct BlobScreen: View {
    @EnvironmentObject var context : Context
    @EnvironmentObject var imageLoader : ImageLoader

    let blob : String
    init(blob : String) {
        self.blob = blob
    }

    var body: some View {
        return VStack {
            AsyncBlob(blob: blob, imageLoader: self.imageLoader)
            .aspectRatio(contentMode: .fit)
        }
    }
}

struct BlobProfileScreen_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            NavigationMenu {
                BlobScreen(blob: "&574bqm3OKE8mKwBjK3TjTj5PuQxl8GElvFyM+JoSBHY=.sha256")
            }
                .environmentObject(Samples.context())
                .environmentObject(ImageLoader())
        }
    }
}


// From https://stackoverflow.com/questions/56533564/showing-uiactivityviewcontroller-in-swiftui
import UIKit

struct ActivityViewController: UIViewControllerRepresentable {

    var activityItems: [Any]
    var applicationActivities: [UIActivity]? = nil

    func makeUIViewController(context: UIViewControllerRepresentableContext<ActivityViewController>) -> UIActivityViewController {
        let controller = UIActivityViewController(activityItems: activityItems, applicationActivities: applicationActivities)
        return controller
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: UIViewControllerRepresentableContext<ActivityViewController>) {}

}

// From https://medium.com/swlh/file-handling-using-swift-f27895b19e22
func createFileToURL(withData data: Data?, withName name: String, toDirectory directory: FileManager.SearchPathDirectory = .applicationSupportDirectory) -> URL? {
    let fileManager = FileManager.default
    let destPath = try? fileManager.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)

    if let fullDestPath = destPath?.appendingPathComponent(name), let data = data {
        do{
            try data.write(to: fullDestPath, options: .atomic)
            return fullDestPath
        } catch let error {
            print ("error \(error)")
        }
    }
    return nil
}
